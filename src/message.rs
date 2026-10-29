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
  let inputs = vec![TxIn {
    previous_output: OutPoint {
      txid: to_spend.compute_txid(),
      vout: 0,
    },
    script_sig: ScriptBuf::new(),
    sequence: locks.sequence,
    witness: Witness::new(),
  }];

  let to_sign = Transaction {
    version: locks.version(),
    lock_time: locks.lock_time,
    input: inputs,
    output: vec![TxOut {
      value: Amount::ZERO,
      script_pubkey: bitcoin::script::Builder::new()
        .push_opcode(opcodes::all::OP_RETURN)
        .into_script(),
    }],
  };

  let mut psbt = Psbt::from_unsigned_tx(to_sign)
    .expect("unsigned transaction has empty script_sigs and witnesses");

  psbt.inputs[0].witness_utxo = Some(TxOut {
    value: Amount::ZERO,
    script_pubkey: to_spend.output[0].script_pubkey.clone(),
  });

  psbt.inputs[0].final_script_witness = witness;

  psbt
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
