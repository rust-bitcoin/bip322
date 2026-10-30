use super::*;

pub const BIP322_TAG: &str = "BIP0322-signed-message";

/// PSBT global key type for the BIP-322 generic signed message
/// (PSBT_GLOBAL_GENERIC_SIGNED_MESSAGE).
pub const PSBT_GLOBAL_GENERIC_SIGNED_MESSAGE: u8 = 0x09;

/// Signature variant prefixes.
pub const SIMPLE_SIGNATURE_PREFIX: &str = "smp";
pub const FULL_SIGNATURE_PREFIX: &str = "ful";
pub const POF_SIGNATURE_PREFIX: &str = "pof";

/// Timelock fields for signatures in the full format, including proofs of
/// funds.
#[derive(Debug, Clone, Copy)]
pub struct LockParams {
  /// `nLockTime` of the `to_sign` transaction — the time T at which the proof
  /// is valid.
  pub lock_time: LockTime,
  /// `nSequence` of `to_sign`'s first input — the age S of the proof.
  pub sequence: Sequence,
}

impl Default for LockParams {
  fn default() -> Self {
    Self {
      lock_time: LockTime::ZERO,
      sequence: Sequence(0),
    }
  }
}

impl LockParams {
  pub fn version(&self) -> Version {
    if self.lock_time != LockTime::ZERO || self.sequence != Sequence(0) {
      Version(2)
    } else {
      Version(0)
    }
  }
}

/// Create the tagged message hash.
pub fn tagged_hash(tag: &str, message: impl AsRef<[u8]>) -> [u8; 32] {
  let tag_hash = Sha256::new().chain_update(tag).finalize();
  Sha256::new()
    .chain_update(tag_hash)
    .chain_update(tag_hash)
    .chain_update(message)
    .finalize()
    .into()
}

/// Create the `to_spend` transaction.
pub fn create_to_spend(address: &Address, message: impl AsRef<[u8]>) -> Transaction {
  create_to_spend_from_script(&address.script_pubkey(), message)
}

/// Create the `to_spend` transaction from a raw script pubkey.
pub fn create_to_spend_from_script(
  script_pubkey: &ScriptBuf,
  message: impl AsRef<[u8]>,
) -> Transaction {
  Transaction {
    version: Version(0),
    lock_time: LockTime::ZERO,
    input: vec![TxIn {
      previous_output: OutPoint {
        txid: "0000000000000000000000000000000000000000000000000000000000000000"
          .parse()
          .unwrap(),
        vout: 0xFFFFFFFF,
      },
      script_sig: bitcoin::script::Builder::new()
        .push_int(0)
        .push_slice::<&PushBytes>(
          tagged_hash(BIP322_TAG, message)
            .as_slice()
            .try_into()
            .unwrap(),
        )
        .into_script(),
      sequence: Sequence(0),
      witness: Witness::new(),
    }],
    output: vec![TxOut {
      value: Amount::ZERO,
      script_pubkey: script_pubkey.clone(),
    }],
  }
}

/// Create the `to_sign` transaction.
pub fn create_to_sign(to_spend: &Transaction, witness: Option<Witness>, locks: LockParams) -> Psbt {
  let mut psbt = Psbt::from_unsigned_tx(to_sign_transaction(to_spend, &[], locks))
    .expect("unsigned transaction has empty script_sigs and witnesses");

  psbt.inputs[0].witness_utxo = Some(TxOut {
    value: Amount::ZERO,
    script_pubkey: to_spend.output[0].script_pubkey.clone(),
  });

  psbt.inputs[0].final_script_witness = witness;

  psbt
}

/// The unsigned `to_sign` transaction: the challenge input, then one input
/// per proven outpoint, and the single OP_RETURN output.
fn to_sign_transaction(
  to_spend: &Transaction,
  proof_inputs: &[ProofInput],
  locks: LockParams,
) -> Transaction {
  let challenge = TxIn {
    previous_output: OutPoint {
      txid: to_spend.compute_txid(),
      vout: 0,
    },
    script_sig: ScriptBuf::new(),
    sequence: locks.sequence,
    witness: Witness::new(),
  };

  let proofs = proof_inputs.iter().map(|input| TxIn {
    previous_output: input.outpoint,
    script_sig: ScriptBuf::new(),
    sequence: Sequence::ZERO,
    witness: Witness::new(),
  });

  Transaction {
    version: locks.version(),
    lock_time: locks.lock_time,
    input: std::iter::once(challenge).chain(proofs).collect(),
    output: vec![TxOut {
      value: Amount::ZERO,
      script_pubkey: op_return(),
    }],
  }
}

/// Builds the unsigned PSBT for a full proof or proof of funds: the
/// `to_sign` transaction, the message field, and the UTXO fields BIP-174
/// requires of every input. Shared by [`sign_pof`] and
/// [`create_bip322_psbt`]; returns `to_spend` alongside.
pub(crate) fn create_proof_psbt(
  address: &Address,
  message: &[u8],
  witness_script: Option<&ScriptBuf>,
  proof_inputs: &[ProofInput],
  locks: LockParams,
) -> Result<(Transaction, Psbt)> {
  std::str::from_utf8(message).map_err(|_| Error::MessageNotUtf8)?;
  check_input_count(proof_inputs.len().saturating_add(1))?;

  let to_spend = create_to_spend(address, message);
  let unsigned = to_sign_transaction(&to_spend, proof_inputs, locks);
  validate_outpoints(&unsigned)?;
  let mut psbt = Psbt::from_unsigned_tx(unsigned).map_err(|_| Error::ToSignInvalid)?;

  // rust-bitcoin has no typed field for PSBT_GLOBAL_GENERIC_SIGNED_MESSAGE
  // yet, so it goes in the unknown map. Switch once upstream adds one.
  psbt.unknown.insert(signed_message_key(), message.to_vec());

  // BIP-174: a segwit challenge carries its witness_utxo, a legacy one the
  // full to_spend transaction.
  let challenge = &to_spend.output[0].script_pubkey;
  let redeem_script = witness_script.map(|script| p2sh_redeem_script(challenge, script));
  if spends_witness(challenge, redeem_script.as_deref()) {
    psbt.inputs[0].witness_utxo = Some(to_spend.output[0].clone());
  } else {
    psbt.inputs[0].non_witness_utxo = Some(to_spend.clone());
  }

  for (index, input) in proof_inputs.iter().enumerate() {
    set_proof_input_utxo(&mut psbt.inputs[index + 1], input, index)?;
  }

  Ok((to_spend, psbt))
}

/// Sets the UTXO field a proof input requires per BIP-174, validating
/// `prev_tx` against the outpoint for legacy inputs.
fn set_proof_input_utxo(
  psbt_input: &mut bitcoin::psbt::Input,
  input: &ProofInput,
  index: usize,
) -> Result<()> {
  let script_pubkey = &input.prevout.script_pubkey;
  let redeem_script = input
    .witness_script
    .as_ref()
    .map(|script| p2sh_redeem_script(script_pubkey, script));
  if spends_witness(script_pubkey, redeem_script.as_deref()) {
    psbt_input.witness_utxo = Some(input.prevout.clone());
    return Ok(());
  }

  let invalid = |reason: &str| Error::InvalidProofInput {
    index,
    reason: reason.into(),
  };

  let prev_tx = input
    .prev_tx
    .as_ref()
    .ok_or_else(|| invalid("legacy input requires prev_tx"))?;

  if prev_tx.compute_txid() != input.outpoint.txid {
    return Err(invalid("prev_tx txid does not match outpoint"));
  }

  let claimed = prev_tx
    .output
    .get(input.outpoint.vout as usize)
    .ok_or_else(|| invalid("outpoint vout exceeds prev_tx outputs"))?;

  if *claimed != input.prevout {
    return Err(invalid("prevout does not match prev_tx output"));
  }

  psbt_input.non_witness_utxo = Some(prev_tx.clone());

  Ok(())
}

/// Rejects an address the simple format cannot prove. A simple proof is
/// only a witness, so it is restricted to native segwit addresses.
pub(crate) fn require_simple_format(address: &Address) -> Result<()> {
  if !matches!(address.to_address_data(), AddressData::Segwit { .. }) {
    return Err(Error::SimpleFormatUnsupported {
      address: address.to_string(),
    });
  }
  Ok(())
}

/// The bare `OP_RETURN` script of `to_sign`'s only output.
pub(crate) fn op_return() -> ScriptBuf {
  ScriptBuf::builder()
    .push_opcode(opcodes::all::OP_RETURN)
    .into_script()
}

/// Whether `outputs` is exactly `to_sign`'s single zero-value bare
/// `OP_RETURN` output.
pub(crate) fn is_bip322_output(outputs: &[TxOut]) -> bool {
  matches!(outputs, [output] if output.value == Amount::ZERO && output.script_pubkey == op_return())
}

/// The key of the PSBT_GLOBAL_GENERIC_SIGNED_MESSAGE field.
pub(crate) fn signed_message_key() -> bitcoin::psbt::raw::Key {
  bitcoin::psbt::raw::Key {
    type_value: PSBT_GLOBAL_GENERIC_SIGNED_MESSAGE,
    key: Vec::new(),
  }
}

pub(crate) fn parse_address(address: &str) -> Result<Address> {
  Ok(
    Address::from_str(address)
      .context(error::AddressParse { address })?
      .assume_checked(),
  )
}

/// Encodes a proof as its variant prefix followed by base64.
pub(crate) fn encode_payload(prefix: &str, payload: &[u8]) -> String {
  format!("{prefix}{}", general_purpose::STANDARD.encode(payload))
}

/// Strips the variant prefix from an encoded proof and decodes the base64
/// payload, returning both the payload text and its bytes. `context` builds
/// the decode error from the payload text.
pub(crate) fn decode_payload<'a, C>(
  encoded: &'a str,
  prefix: &str,
  context: impl FnOnce(&'a str) -> C,
) -> Result<(&'a str, Vec<u8>)>
where
  C: snafu::IntoError<Error, Source = base64::DecodeError>,
{
  let payload = strip_variant_prefix(encoded, prefix)?;
  let bytes = general_purpose::STANDARD
    .decode(payload)
    .context(context(payload))?;
  Ok((payload, bytes))
}

/// Strips the variant prefix, rejecting a signature encoded for a different variant.
/// An unprefixed signature is returned unchanged.
pub(crate) fn strip_variant_prefix<'a>(signature: &'a str, expected: &str) -> Result<&'a str> {
  for prefix in [
    SIMPLE_SIGNATURE_PREFIX,
    FULL_SIGNATURE_PREFIX,
    POF_SIGNATURE_PREFIX,
  ] {
    if let Some(rest) = signature.strip_prefix(prefix) {
      if prefix != expected {
        return Err(Error::SignatureVariantMismatch {
          expected: expected.into(),
          found: prefix.into(),
        });
      }
      return Ok(rest);
    }
  }

  Ok(signature)
}
