use super::*;

/// Outcome of BIP-322 verification, per the spec's three validator states.
/// The verify functions always return a verdict: [`Verification::Invalid`]
/// covers both malformed encodings and proofs that failed a required check.
#[must_use]
#[derive(Debug)]
pub enum Verification {
  /// "valid at time T and age S": `time` is `to_sign`'s `nLockTime`, `age`
  /// is the `nSequence` of its first input.
  Valid {
    /// `nLockTime` of `to_sign` — the time T at which the proof is valid.
    time: LockTime,
    /// `nSequence` of `to_sign`'s first input — the age S.
    age: Sequence,
  },
  /// The validator could not interpret the script; neither accepted nor rejected.
  Inconclusive,
  /// The proof failed a required check.
  Invalid(Error),
}

/// Per-input outcome: `Valid`, or `Inconclusive` when this validator cannot
/// interpret the input's script. Failed checks travel in the `Err` channel of
/// the internal helpers and become [`Verification::Invalid`] at the public
/// boundary.
#[derive(Debug)]
enum InputVerification {
  /// The input's script was interpreted and its signature(s) check out.
  Valid,
  /// The input's script cannot be interpreted by this validator
  Inconclusive,
}

impl Verification {
  /// Whether the proof verified.
  pub fn is_valid(&self) -> bool {
    matches!(self, Verification::Valid { .. })
  }

  /// Whether the validator could not interpret the script; the proof is
  /// neither accepted nor rejected.
  pub fn is_inconclusive(&self) -> bool {
    matches!(self, Verification::Inconclusive)
  }

  /// Whether the proof was malformed or failed a required check.
  pub fn is_invalid(&self) -> bool {
    matches!(self, Verification::Invalid(_))
  }
}

/// Verifies a BIP-137 legacy proof from string inputs.
pub fn verify_legacy_encoded(address: &str, message: &str, signature: &str) -> Result<()> {
  let address = Address::from_str(address)
    .context(error::AddressParse { address })?
    .assume_checked();

  let signature_bytes = general_purpose::STANDARD
    .decode(signature)
    .context(error::SignatureDecode { signature })?;

  if signature_bytes.len() != 65 {
    return Err(Error::SignatureLength {
      length: signature_bytes.len(),
      encoded_signature: signature_bytes,
    });
  }

  let flag = signature_bytes[0];
  if !(27..=34).contains(&flag) {
    return Err(Error::InvalidRecoveryFlag { flag });
  }

  let signature = MessageSignature::from_slice(&signature_bytes).context(error::LegacyRecover)?;

  verify_legacy(&address, message, signature)
}

/// Verifies a BIP-137 legacy proof from proper Rust types.
pub fn verify_legacy(address: &Address, message: &str, signature: MessageSignature) -> Result<()> {
  if !matches!(address.to_address_data(), AddressData::P2pkh { .. }) {
    return Err(Error::UnsupportedAddress {
      address: address.to_string(),
    });
  }

  let recovered = signature
    .recover_pubkey(&Secp256k1::verification_only(), signed_msg_hash(message))
    .context(error::LegacyRecover)?;

  if address.script_pubkey() != ScriptBuf::new_p2pkh(&recovered.pubkey_hash()) {
    return Err(Error::PublicKeyMismatch);
  }

  Ok(())
}

/// Verifies the BIP-322 simple from spec-compliant string encodings.
///
/// A malformed encoding is reported as [`Verification::Invalid`], like any
/// other failed check — the return value is always the verdict.
pub fn verify_simple_encoded(address: &str, message: &str, signature: &str) -> Verification {
  decode_simple(address, signature)
    .map(|(address, witness)| verify_simple(&address, message, witness))
    .unwrap_or_else(Verification::Invalid)
}

fn decode_simple(address: &str, signature: &str) -> Result<(Address, Witness)> {
  let address = Address::from_str(address)
    .context(error::AddressParse { address })?
    .assume_checked();

  let signature = strip_variant_prefix(signature, SIMPLE_SIGNATURE_PREFIX)?;

  let bytes = general_purpose::STANDARD
    .decode(signature)
    .context(error::SignatureDecode { signature })?;
  let length = bytes.len() as u64;

  let mut cursor = bitcoin::io::Cursor::new(bytes);

  let witness =
    Witness::consensus_decode_from_finite_reader(&mut cursor).context(error::WitnessMalformed)?;

  if cursor.position() != length {
    return Err(Error::TrailingBytes);
  }

  Ok((address, witness))
}

/// Verifies the BIP-322 full from spec-compliant string encodings.
///
/// A malformed encoding is reported as [`Verification::Invalid`], like any
/// other failed check — the return value is always the verdict.
pub fn verify_full_encoded(address: &str, message: &str, to_sign: &str) -> Verification {
  decode_full(address, to_sign)
    .map(|(address, to_sign)| verify_full(&address, message, to_sign))
    .unwrap_or_else(Verification::Invalid)
}

fn decode_full(address: &str, to_sign: &str) -> Result<(Address, Transaction)> {
  let address = Address::from_str(address)
    .context(error::AddressParse { address })?
    .assume_checked();

  let to_sign = strip_variant_prefix(to_sign, FULL_SIGNATURE_PREFIX)?;

  let bytes =
    general_purpose::STANDARD
      .decode(to_sign)
      .context(error::TransactionBase64Decode {
        transaction: to_sign,
      })?;
  let length = bytes.len() as u64;

  let mut cursor = bitcoin::io::Cursor::new(bytes);

  let to_sign = Transaction::consensus_decode_from_finite_reader(&mut cursor).context(
    error::TransactionConsensusDecode {
      transaction: to_sign,
    },
  )?;

  if cursor.position() != length {
    return Err(Error::TrailingBytes);
  }

  Ok((address, to_sign))
}

/// Verifies a BIP-322 full proof of funds.
///
/// See [`verify_pof`] for how each proven input's previous output is resolved.
///
/// A malformed encoding is reported as [`Verification::Invalid`], like any
/// other failed check — the return value is always the verdict.
pub fn verify_pof_encoded(address: &str, message: &str, to_sign: &str) -> Verification {
  decode_pof(address, to_sign)
    .map(|(address, psbt)| verify_pof(&address, message, psbt))
    .unwrap_or_else(Verification::Invalid)
}

fn decode_pof(address: &str, to_sign: &str) -> Result<(Address, Psbt)> {
  let address = Address::from_str(address)
    .context(error::AddressParse { address })?
    .assume_checked();

  let to_sign = strip_variant_prefix(to_sign, POF_SIGNATURE_PREFIX)?;

  let bytes =
    general_purpose::STANDARD
      .decode(to_sign)
      .context(error::TransactionBase64Decode {
        transaction: to_sign,
      })?;

  let length = bytes.len() as u64;

  let mut cursor = bitcoin::io::Cursor::new(bytes);

  let psbt = Psbt::deserialize_from_reader(&mut cursor).map_err(|_| Error::ToSignInvalid)?;

  if cursor.position() != length {
    return Err(Error::TrailingBytes);
  }

  Ok((address, psbt))
}

/// Verifies the BIP-322 simple format.
///
/// Accepts P2SH-P2WPKH in addition to the native segwit types the BIP's
/// simple table lists — a deliberate superset, since verifier-side leniency
/// is harmless. Legacy P2SH and nested P2SH-P2WSH require scriptSig data and
/// therefore require the full format.
///
/// The witness is verified by building the corresponding full `to_sign`
/// transaction around it. That construction is infallible — a freshly built
/// transaction with a final witness always extracts — so the internal
/// `extract_tx` call uses `expect` rather than a fallible return.
pub fn verify_simple(
  address: &Address,
  message: impl AsRef<[u8]>,
  signature: Witness,
) -> Verification {
  let to_sign = create_to_sign(
    &create_to_spend(address, &message),
    Some(signature),
    LockParams::default(),
  )
  .extract_tx()
  .expect("extracting a freshly built transaction cannot fail");

  verify_full(address, &message, to_sign)
}

/// Verifies the BIP-322 full format.
///
/// The `to_sign` transaction must have exactly one input, spending the
/// `to_spend` challenge output. The BIP's basic validation says "at least
/// one input", but additional inputs' prevouts cannot be resolved outside a
/// PSBT — proving further inputs is what [`verify_pof`] is for — so a
/// multi-input `to_sign` is rejected.
pub fn verify_full(
  address: &Address,
  message: impl AsRef<[u8]>,
  to_sign: Transaction,
) -> Verification {
  let to_spend = create_to_spend(address, &message);

  if !check_to_sign(&to_spend, &to_sign) {
    return Verification::Invalid(Error::ToSignInvalid);
  }

  let challenge_prevout = TxOut {
    value: Amount::ZERO,
    script_pubkey: to_spend.output[0].script_pubkey.clone(),
  };

  // Required rules take precedence over upgradeable rules and interpretation.
  if spends_codeseparator(&to_sign, std::slice::from_ref(&challenge_prevout)) {
    return Verification::Invalid(Error::CodeSeparator);
  }

  // Upgradeable rule: nVersion must be 0 or 2, else inconclusive.
  if !matches!(to_sign.version, Version(0) | Version(2)) {
    return Verification::Inconclusive;
  }

  match verify_input(&to_sign, &[challenge_prevout], 0) {
    Ok(InputVerification::Valid) => Verification::Valid {
      time: to_sign.lock_time,
      age: to_sign.input[0].sequence,
    },
    Ok(InputVerification::Inconclusive) => Verification::Inconclusive,
    Err(error) => Verification::Invalid(error),
  }
}

fn check_to_sign(to_spend: &Transaction, to_sign: &Transaction) -> bool {
  let to_spend_outpoint = OutPoint {
    txid: to_spend.compute_txid(),
    vout: 0,
  };

  let op_return = script::Builder::new()
    .push_opcode(opcodes::all::OP_RETURN)
    .into_script();

  to_sign.input.len() == 1
    && to_sign.input[0].previous_output == to_spend_outpoint
    && to_sign.output.len() == 1
    && to_sign.output[0].value == Amount::ZERO
    && to_sign.output[0].script_pubkey == op_return
}

/// Verifies a BIP-322 full proof of funds.
///
/// Each proven input's previous output is taken from the PSBT's own
/// `witness_utxo`, or from a `non_witness_utxo` on that input or on an
/// earlier input spending the same transaction. An input with neither is
/// rejected.
///
/// Note that the UTXO data is supplied by the prover: verification only
/// checks that it is internally consistent and signed for. Callers must
/// independently confirm on-chain that each outpoint exists with the claimed
/// script and value.
pub fn verify_pof(address: &Address, message: impl AsRef<[u8]>, psbt: Psbt) -> Verification {
  let msg_key = bitcoin::psbt::raw::Key {
    type_value: PSBT_GLOBAL_GENERIC_SIGNED_MESSAGE,
    key: vec![],
  };
  // The message is already a validator input and is bound by to_spend's
  // scriptSig; the PSBT field exists for the signing flow. Official BIP-322
  // proof-of-funds vectors omit it, so it is optional here — but when
  // present it must match the message.
  if let Some(val) = psbt.unknown.get(&msg_key) {
    if val != message.as_ref() {
      return Verification::Invalid(Error::ToSignInvalid);
    }
  }

  let to_spend = create_to_spend(address, &message);
  let to_spend_outpoint = OutPoint {
    txid: to_spend.compute_txid(),
    vout: 0,
  };

  let unsigned_tx = &psbt.unsigned_tx;

  if unsigned_tx.input.len() < 2 {
    return Verification::Invalid(Error::ToSignInvalid);
  }
  if unsigned_tx.input[0].previous_output != to_spend_outpoint {
    return Verification::Invalid(Error::ToSignInvalid);
  }
  if psbt.inputs.len() != unsigned_tx.input.len() {
    return Verification::Invalid(Error::ToSignInvalid);
  }

  if unsigned_tx.output.len() != 1
    || !unsigned_tx.output[0].script_pubkey.is_op_return()
    || unsigned_tx.output[0].value != Amount::ZERO
  {
    return Verification::Invalid(Error::ToSignInvalid);
  }

  // Consensus: no two inputs may spend the same outpoint.
  for (i, input) in unsigned_tx.input.iter().enumerate() {
    if unsigned_tx.input[..i]
      .iter()
      .any(|earlier| earlier.previous_output == input.previous_output)
    {
      return Verification::Invalid(Error::ToSignInvalid);
    }
  }

  let mut all_prevouts = Vec::with_capacity(unsigned_tx.input.len());
  all_prevouts.push(TxOut {
    value: Amount::ZERO,
    script_pubkey: to_spend.output[0].script_pubkey.clone(),
  });

  for index in 1..unsigned_tx.input.len() {
    let outpoint = unsigned_tx.input[index].previous_output;
    let psbt_input = &psbt.inputs[index];

    let prevout = if let Some(txout) = &psbt_input.witness_utxo {
      txout.clone()
    } else {
      let Some(tx) = psbt_input.non_witness_utxo.as_ref().or_else(|| {
        (1..index).find_map(|i| {
          (unsigned_tx.input[i].previous_output.txid == outpoint.txid)
            .then(|| psbt.inputs[i].non_witness_utxo.as_ref())
            .flatten()
        })
      }) else {
        return Verification::Invalid(Error::ToSignInvalid);
      };

      if tx.compute_txid() != outpoint.txid {
        return Verification::Invalid(Error::ToSignInvalid);
      }

      let Some(txout) = tx.output.get(outpoint.vout as usize) else {
        return Verification::Invalid(Error::ToSignInvalid);
      };

      txout.clone()
    };

    all_prevouts.push(prevout);
  }

  let to_sign = psbt.extract_tx_unchecked_fee_rate();

  // Check required rules across every input before any one input can return
  // inconclusive. Otherwise the verdict would depend on input order.
  if spends_codeseparator(&to_sign, &all_prevouts) {
    return Verification::Invalid(Error::CodeSeparator);
  }

  // Upgradeable rule: nVersion must be 0 or 2, else inconclusive.
  if !matches!(to_sign.version, Version(0) | Version(2)) {
    return Verification::Inconclusive;
  }

  for input_index in 0..to_sign.input.len() {
    match verify_input(&to_sign, &all_prevouts, input_index) {
      Ok(InputVerification::Valid) => {}
      Ok(InputVerification::Inconclusive) => return Verification::Inconclusive,
      Err(error) => return Verification::Invalid(error),
    }
  }

  Verification::Valid {
    time: to_sign.lock_time,
    age: to_sign.input[0].sequence,
  }
}

/// Verifies input.
fn verify_input(
  to_sign: &Transaction,
  prevouts: &[TxOut],
  input_index: usize,
) -> Result<InputVerification> {
  match verify_standard_script(to_sign, prevouts, input_index)? {
    InputVerification::Inconclusive => verify_with_interpreter(to_sign, prevouts, input_index),
    valid => Ok(valid),
  }
}

/// Whether any input executes a script containing OP_CODESEPARATOR.
fn spends_codeseparator(to_sign: &Transaction, prevouts: &[TxOut]) -> bool {
  (0..to_sign.input.len())
    .any(|input_index| input_spends_codeseparator(to_sign, prevouts, input_index))
}

/// Whether this input executes a script containing OP_CODESEPARATOR: the
/// scriptSig, scriptPubKey, P2SH redeem script, native or nested P2WSH witness
/// script, or P2TR script-path tapscript.
fn input_spends_codeseparator(
  to_sign: &Transaction,
  prevouts: &[TxOut],
  input_index: usize,
) -> bool {
  let txin = &to_sign.input[input_index];
  let script_pubkey = &prevouts[input_index].script_pubkey;

  if contains_codeseparator(&txin.script_sig) || contains_codeseparator(script_pubkey) {
    return true;
  }

  if script_pubkey.is_p2sh() {
    // The redeem script is the last scriptSig push.
    if let Some(Ok(Instruction::PushBytes(redeem_script))) =
      txin.script_sig.instructions_minimal().last()
    {
      if contains_codeseparator(Script::from_bytes(redeem_script.as_bytes())) {
        return true;
      }
    }
  }

  if script_pubkey.is_p2wsh() || script_pubkey.is_p2sh() {
    if let Some(witness_script) = txin.witness.last().map(Script::from_bytes) {
      let program = ScriptBuf::new_p2wsh(&witness_script.wscript_hash());
      let nested_program = ScriptBuf::new_p2sh(&program.script_hash());

      // Identify the script from the challenge itself rather than relying on
      // scriptSig. Simple proofs have an empty scriptSig, and arbitrary witness
      // items must not be parsed as scripts.
      if (script_pubkey == &program || script_pubkey == &nested_program)
        && contains_codeseparator(witness_script)
      {
        return true;
      }
    }
  }

  if script_pubkey.is_p2tr() && txin.witness.len() >= 2 {
    let items: Vec<&[u8]> = txin.witness.iter().collect();

    // An annex is the last item and begins with 0x50; the control block
    // precedes it and the tapscript precedes the control block.
    let mut control_index = items.len() - 1;
    if items[control_index].first() == Some(&0x50) {
      control_index -= 1;
    }

    let control_block = items[control_index];
    if control_block.len() >= 33
      && (control_block.len() - 33) % 32 == 0
      && control_block[0] & 0xfe == 0xc0
      && control_index >= 1
      && contains_codeseparator(Script::from_bytes(items[control_index - 1]))
    {
      return true;
    }
  }

  false
}

/// Whether a script contains OP_CODESEPARATOR as an opcode (occurrences
/// inside pushed data do not count).
fn contains_codeseparator(script: &Script) -> bool {
  script.instructions().any(
    |instruction| matches!(instruction, Ok(Instruction::Op(opcode)) if opcode == opcodes::all::OP_CODESEPARATOR),
  )
}

/// Fallback verification via the miniscript interpreter for scripts the
/// templates cannot classify.
///
/// Returns `Inconclusive` when the interpreter cannot parse the spend, so a
/// script this validator does not understand is neither accepted nor rejected.
fn verify_with_interpreter(
  to_sign: &Transaction,
  prevouts: &[TxOut],
  input_index: usize,
) -> Result<InputVerification> {
  use miniscript::interpreter::{Interpreter, KeySigPair, SatisfiedConstraint};

  let prevout = &prevouts[input_index];
  let txin = &to_sign.input[input_index];

  let interpreter = match Interpreter::from_txdata(
    &prevout.script_pubkey,
    &txin.script_sig,
    &txin.witness,
    txin.sequence,
    to_sign.lock_time,
  ) {
    Ok(interpreter) => interpreter,
    Err(_) => return Ok(InputVerification::Inconclusive),
  };

  let secp = Secp256k1::verification_only();
  let prevouts_all = sighash::Prevouts::All(prevouts);

  for result in interpreter.iter(&secp, to_sign, input_index, &prevouts_all) {
    match result {
      Ok(SatisfiedConstraint::PublicKey { key_sig })
      | Ok(SatisfiedConstraint::PublicKeyHash { key_sig, .. }) => match key_sig {
        KeySigPair::Ecdsa(_, signature) => {
          if signature.sighash_type != EcdsaSighashType::All {
            return Err(Error::SigHashTypeUnsupported {
              sighash_type: signature.sighash_type.to_string(),
            });
          }
          require_low_s(&signature.signature)?;
        }
        KeySigPair::Schnorr(_, signature) => {
          if signature.sighash_type != TapSighashType::All
            && signature.sighash_type != TapSighashType::Default
          {
            return Err(Error::SigHashTypeUnsupported {
              sighash_type: signature.sighash_type.to_string(),
            });
          }
        }
      },
      Ok(_) => {}
      Err(miniscript::interpreter::Error::EcdsaSig(_))
      | Err(miniscript::interpreter::Error::SchnorrSig(_))
      | Err(miniscript::interpreter::Error::InvalidEcdsaSignature(_))
      | Err(miniscript::interpreter::Error::InvalidSchnorrSignature(_))
      | Err(miniscript::interpreter::Error::InvalidSchnorrSighashType(_)) => {
        return Err(Error::SignatureInvalid {
          source: bitcoin::secp256k1::Error::IncorrectSignature,
        })
      }
      Err(_) => return Err(Error::ScriptNotSatisfied),
    }
  }

  Ok(InputVerification::Valid)
}

/// Verifies the standard script types by template. Returns `Inconclusive`
/// for anything else, which [`verify_input`] hands to the interpreter.
fn verify_standard_script(
  to_sign: &Transaction,
  prevouts: &[TxOut],
  input_index: usize,
) -> Result<InputVerification> {
  let prevout = &prevouts[input_index];
  let spk = &prevout.script_pubkey;

  if spk.is_p2tr() {
    verify_full_p2tr(to_sign, prevouts, input_index)
  } else if spk.is_p2wsh() {
    verify_full_p2wsh(to_sign, prevout, input_index)
  } else if spk.is_p2wpkh() {
    verify_full_p2wpkh(to_sign, prevout, input_index, false)
  } else if spk.is_p2sh() {
    let witness = &to_sign.input[input_index].witness;
    let script_sig = &to_sign.input[input_index].script_sig;

    // The redeem script is the last scriptSig push. Dispatch on its shape
    // rather than the witness length, so a nested P2WSH spend with few
    // witness items is not mistaken for a nested P2WPKH spend.
    let redeem_program = script_sig
      .instructions_minimal()
      .last()
      .and_then(|instruction| match instruction {
        Ok(Instruction::PushBytes(bytes)) => Some(bytes.as_bytes()),
        _ => None,
      });

    match redeem_program {
      Some(program) if program.len() == 22 && program[..2] == [0x00, 0x14] => {
        verify_full_p2wpkh(to_sign, prevout, input_index, true)
      }
      Some(program) if program.len() == 34 && program[..2] == [0x00, 0x20] => {
        verify_full_p2wsh(to_sign, prevout, input_index)
      }
      Some(_) => verify_full_p2sh_multisig(to_sign, prevout, input_index),
      // No redeem script in the scriptSig: keep the witness-length heuristic
      // for the nested-segwit cases that tolerate an empty scriptSig.
      None => match witness.len() {
        0 => verify_full_p2sh_multisig(to_sign, prevout, input_index),
        2 => verify_full_p2wpkh(to_sign, prevout, input_index, true),
        n if n > 2 => verify_full_p2wsh(to_sign, prevout, input_index),
        _ => Ok(InputVerification::Inconclusive),
      },
    }
  } else if spk.is_p2pkh() {
    verify_full_p2pkh(to_sign, prevout, input_index)
  } else {
    Ok(InputVerification::Inconclusive)
  }
}

fn verify_full_p2wpkh(
  to_sign: &Transaction,
  prevout: &TxOut,
  input_index: usize,
  is_p2sh: bool,
) -> Result<InputVerification> {
  let witness = to_sign.input[input_index].witness.clone();

  if witness.is_empty() {
    return Err(Error::WitnessEmpty);
  }

  if witness.len() != 2 {
    return Err(Error::InvalidWitness);
  }

  let encoded_signature = witness.to_vec()[0].clone();
  let witness_pub_key = &witness.to_vec()[1];

  let pub_key = PublicKey::from_slice(witness_pub_key).map_err(|_| Error::InvalidPublicKey)?;

  let wpubkey_hash = pub_key
    .wpubkey_hash()
    .context(error::UncompressedPublicKey)?;

  let p2wpkh_script = ScriptBuf::new_p2wpkh(&wpubkey_hash);

  let expected_script_pubkey = if is_p2sh {
    ScriptBuf::new_p2sh(&p2wpkh_script.script_hash())
  } else {
    p2wpkh_script.clone()
  };

  if prevout.script_pubkey != expected_script_pubkey {
    return Err(Error::PublicKeyMismatch);
  }

  let script_sig = &to_sign.input[input_index].script_sig;
  if is_p2sh {
    if !script_sig.is_empty() && *script_sig != push_only_script(&p2wpkh_script) {
      return Err(Error::ToSignInvalid);
    }
  } else if !script_sig.is_empty() {
    return Err(Error::ToSignInvalid);
  }

  if encoded_signature.is_empty() {
    return Err(Error::SignatureLength {
      length: 0,
      encoded_signature,
    });
  }

  let signature_length = encoded_signature.len();

  let signature = bitcoin::secp256k1::ecdsa::Signature::from_der(
    &encoded_signature.as_slice()[..signature_length - 1],
  )
  .context(error::SignatureInvalid)?;

  let sighash_type =
    EcdsaSighashType::from_standard(encoded_signature[signature_length - 1] as u32)
      .context(error::SigHashTypeNonStandard)?;

  require_low_s(&signature)?;

  if !(sighash_type == EcdsaSighashType::All) {
    return Err(Error::SigHashTypeUnsupported {
      sighash_type: sighash_type.to_string(),
    });
  }

  let mut sighash_cache = SighashCache::new(to_sign);

  let sighash = sighash_cache
    .p2wpkh_signature_hash(input_index, &p2wpkh_script, prevout.value, sighash_type)
    .expect("signature hash should compute");

  let message =
    Message::from_digest_slice(sighash.as_ref()).expect("should be cryptographically secure hash");

  Secp256k1::verification_only()
    .verify_ecdsa(&message, &signature, &pub_key.inner)
    .context(error::SignatureInvalid)?;

  Ok(InputVerification::Valid)
}

fn verify_full_p2tr(
  to_sign: &Transaction,
  prevouts: &[TxOut],
  input_index: usize,
) -> Result<InputVerification> {
  let prevout = &prevouts[input_index];

  let pub_key = XOnlyPublicKey::from_slice(&prevout.script_pubkey.as_bytes()[2..])
    .map_err(|_| Error::InvalidPublicKey)?;

  if !to_sign.input[input_index].script_sig.is_empty() {
    return Err(Error::ToSignInvalid);
  }

  let witness = to_sign.input[input_index].witness.clone();

  if witness.is_empty() {
    return Err(Error::WitnessEmpty);
  }

  // A key-path spend is exactly one item. More items mean a script-path
  // spend or an annex, which only the interpreter can evaluate.
  if witness.len() != 1 {
    return Ok(InputVerification::Inconclusive);
  }

  let encoded_signature = witness.to_vec()[0].clone();

  let (signature, sighash_type) = match encoded_signature.len() {
    65 => (
      Signature::from_slice(&encoded_signature.as_slice()[..64])
        .context(error::SignatureInvalid)?,
      TapSighashType::from_consensus_u8(encoded_signature[64])
        .context(error::SigHashTypeInvalid)?,
    ),
    64 => (
      Signature::from_slice(encoded_signature.as_slice()).context(error::SignatureInvalid)?,
      TapSighashType::Default,
    ),
    _ => {
      return Err(Error::SignatureLength {
        length: encoded_signature.len(),
        encoded_signature,
      })
    }
  };

  if !(sighash_type == TapSighashType::All || sighash_type == TapSighashType::Default) {
    return Err(Error::SigHashTypeUnsupported {
      sighash_type: sighash_type.to_string(),
    });
  }

  let mut sighash_cache = SighashCache::new(to_sign);

  let sighash = sighash_cache
    .taproot_key_spend_signature_hash(input_index, &sighash::Prevouts::All(prevouts), sighash_type)
    .expect("signature hash should compute");

  let message =
    Message::from_digest_slice(sighash.as_ref()).expect("should be cryptographically secure hash");

  Secp256k1::verification_only()
    .verify_schnorr(&signature, &message, &pub_key)
    .context(error::SignatureInvalid)?;

  Ok(InputVerification::Valid)
}

/// Verify a BIP-322 proof for a P2WSH
fn verify_full_p2wsh(
  to_sign: &Transaction,
  prevout: &TxOut,
  input_index: usize,
) -> Result<InputVerification> {
  let witness_items = to_sign.input[input_index].witness.to_vec();

  if witness_items.is_empty() {
    return Err(Error::InvalidWitness);
  }

  let witness_script = ScriptBuf::from_bytes(witness_items[witness_items.len() - 1].clone());

  let program = ScriptBuf::new_p2wsh(&witness_script.wscript_hash());
  let script_sig = &to_sign.input[input_index].script_sig;

  if prevout.script_pubkey == program {
    if !script_sig.is_empty() {
      return Err(Error::ToSignInvalid);
    }
  } else if prevout.script_pubkey == ScriptBuf::new_p2sh(&program.script_hash()) {
    if *script_sig != push_only_script(&program) {
      return Err(Error::ToSignInvalid);
    }
  } else {
    return Err(Error::ToSignInvalid);
  }

  let Ok((required_signatures, pubkeys)) = parse_multisig(&witness_script) else {
    return Ok(InputVerification::Inconclusive);
  };

  if witness_items.len() < 3 || !witness_items[0].is_empty() {
    return Err(Error::InvalidWitness);
  }

  let signatures = &witness_items[1..witness_items.len() - 1];
  if signatures.len() != required_signatures {
    return Err(Error::InvalidWitness);
  }

  let sighash = SighashCache::new(to_sign)
    .p2wsh_signature_hash(
      input_index,
      &witness_script,
      prevout.value,
      EcdsaSighashType::All,
    )
    .expect("signature hash should compute");

  let message =
    Message::from_digest_slice(sighash.as_ref()).expect("should be cryptographically secure hash");

  let secp = Secp256k1::verification_only();

  // CHECKMULTISIG: signatures must appear in the same order as pubkeys
  let mut sig_index = 0usize;
  for pub_key in &pubkeys {
    if sig_index == signatures.len() {
      break;
    }

    let encoded = &signatures[sig_index];
    let length = encoded.len();
    if length < 1 {
      return Err(Error::InvalidWitness);
    }

    let sighash_type = EcdsaSighashType::from_standard(encoded[length - 1] as u32)
      .context(error::SigHashTypeNonStandard)?;

    if sighash_type != EcdsaSighashType::All {
      return Err(Error::SigHashTypeUnsupported {
        sighash_type: sighash_type.to_string(),
      });
    }

    if let Ok(signature) = bitcoin::secp256k1::ecdsa::Signature::from_der(&encoded[..length - 1]) {
      require_low_s(&signature)?;

      if secp
        .verify_ecdsa(&message, &signature, &pub_key.inner)
        .is_ok()
      {
        sig_index += 1;
      }
    }
  }

  if sig_index == signatures.len() {
    Ok(InputVerification::Valid)
  } else {
    Err(Error::SignatureInvalid {
      source: bitcoin::secp256k1::Error::IncorrectSignature,
    })
  }
}

/// Verify a BIP-322 proof for a P2SH multisig address
fn verify_full_p2sh_multisig(
  to_sign: &Transaction,
  prevout: &TxOut,
  input_index: usize,
) -> Result<InputVerification> {
  let mut pushes: Vec<Vec<u8>> = Vec::new();

  for instruction in to_sign.input[input_index].script_sig.instructions_minimal() {
    match instruction {
      Ok(Instruction::PushBytes(b)) => pushes.push(b.as_bytes().to_vec()),
      _ => return Err(Error::InvalidWitness),
    }
  }

  let Some((redeem_bytes, sig_pushes)) = pushes.split_last() else {
    return Err(Error::InvalidWitness);
  };
  let redeem_script = ScriptBuf::from_bytes(redeem_bytes.clone());

  if prevout.script_pubkey != ScriptBuf::new_p2sh(&redeem_script.script_hash()) {
    return Err(Error::ToSignInvalid);
  }

  let Ok((required_signatures, pubkeys)) = parse_multisig(&redeem_script) else {
    return Ok(InputVerification::Inconclusive);
  };
  let Some((null_dummy, signatures)) = sig_pushes.split_first() else {
    return Err(Error::InvalidWitness);
  };

  if !null_dummy.is_empty()
    || signatures.iter().any(|signature| signature.is_empty())
    || signatures.len() != required_signatures
  {
    return Err(Error::InvalidWitness);
  }

  let sighash = SighashCache::new(to_sign)
    .legacy_signature_hash(input_index, &redeem_script, EcdsaSighashType::All.to_u32())
    .expect("signature hash should compute");
  let message =
    Message::from_digest_slice(sighash.as_ref()).expect("should be cryptographically secure hash");

  let secp = Secp256k1::verification_only();

  let mut key_index = 0usize;
  for encoded in signatures {
    let Some((sighash_byte, der)) = encoded.split_last() else {
      return Err(Error::InvalidWitness);
    };

    let sighash_type = EcdsaSighashType::from_standard(*sighash_byte as u32)
      .context(error::SigHashTypeNonStandard)?;

    if sighash_type != EcdsaSighashType::All {
      return Err(Error::SigHashTypeUnsupported {
        sighash_type: sighash_type.to_string(),
      });
    }

    let signature =
      bitcoin::secp256k1::ecdsa::Signature::from_der(der).context(error::SignatureInvalid)?;

    require_low_s(&signature)?;

    let offset = pubkeys[key_index..]
      .iter()
      .position(|pk| secp.verify_ecdsa(&message, &signature, &pk.inner).is_ok())
      .ok_or(Error::SignatureInvalid {
        source: bitcoin::secp256k1::Error::IncorrectSignature,
      })?;

    key_index += offset + 1;
  }

  Ok(InputVerification::Valid)
}

/// Verify a BIP-322 proof for a P2PKH
fn verify_full_p2pkh(
  to_sign: &Transaction,
  prevout: &TxOut,
  input_index: usize,
) -> Result<InputVerification> {
  if !to_sign.input[input_index].witness.is_empty() {
    return Err(Error::InvalidWitness);
  }

  // scriptSig: <sig> <pubkey>
  let mut instructions = to_sign.input[input_index].script_sig.instructions_minimal();
  let signature_bytes = match instructions.next() {
    Some(Ok(Instruction::PushBytes(b))) => b.as_bytes(),
    _ => return Err(Error::InvalidWitness),
  };
  let pubkey_bytes = match instructions.next() {
    Some(Ok(Instruction::PushBytes(b))) => b.as_bytes(),
    _ => return Err(Error::InvalidWitness),
  };
  if instructions.next().is_some() {
    return Err(Error::InvalidWitness);
  }

  let pub_key = PublicKey::from_slice(pubkey_bytes).map_err(|_| Error::InvalidPublicKey)?;

  if prevout.script_pubkey != ScriptBuf::new_p2pkh(&pub_key.pubkey_hash()) {
    return Err(Error::PublicKeyMismatch);
  }

  let (sighash_byte, der) = signature_bytes.split_last().ok_or(Error::InvalidWitness)?;

  let sighash_type =
    EcdsaSighashType::from_standard(*sighash_byte as u32).context(error::SigHashTypeNonStandard)?;

  if sighash_type != EcdsaSighashType::All {
    return Err(Error::SigHashTypeUnsupported {
      sighash_type: sighash_type.to_string(),
    });
  }
  let signature =
    bitcoin::secp256k1::ecdsa::Signature::from_der(der).context(error::SignatureInvalid)?;

  require_low_s(&signature)?;

  let sighash = SighashCache::new(to_sign)
    .legacy_signature_hash(
      input_index,
      &prevout.script_pubkey,
      EcdsaSighashType::All.to_u32(),
    )
    .expect("signature hash should compute");
  let msg =
    Message::from_digest_slice(sighash.as_ref()).expect("should be cryptographically secure hash");

  Secp256k1::verification_only()
    .verify_ecdsa(&msg, &signature, &pub_key.inner)
    .context(error::SignatureInvalid)?;

  Ok(InputVerification::Valid)
}
