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
  /// The templates could not classify the script; try the interpreter.
  Unsupported,
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
  if !valid_witness_encoding(&bytes) {
    return Err(Error::InvalidWitness);
  }
  let length = bytes.len() as u64;

  let mut cursor = bitcoin::io::Cursor::new(bytes);

  let witness =
    Witness::consensus_decode_from_finite_reader(&mut cursor).context(error::WitnessMalformed)?;

  if cursor.position() != length {
    return Err(Error::TrailingBytes);
  }

  Ok((address, witness))
}

/// Checks CompactSize counts and lengths before rust-bitcoin allocates from
/// attacker-controlled values. Every witness item needs at least its length
/// prefix, so a count larger than the remaining byte count is impossible.
pub(crate) fn valid_witness_encoding(bytes: &[u8]) -> bool {
  fn compact_size(bytes: &[u8], position: &mut usize) -> Option<u64> {
    let first = *bytes.get(*position)?;
    *position += 1;
    let (width, minimum) = match first {
      0xfd => (2, 0xfd),
      0xfe => (4, 0x1_0000),
      0xff => (8, 0x1_0000_0000),
      value => return Some(u64::from(value)),
    };
    let end = position.checked_add(width)?;
    let raw = bytes.get(*position..end)?;
    let mut value = 0u64;
    for byte in raw.iter().rev() {
      value = (value << 8) | u64::from(*byte);
    }
    *position = end;
    (value >= minimum).then_some(value)
  }

  let mut position = 0;
  let Some(count) = compact_size(bytes, &mut position) else {
    return false;
  };
  if count > (bytes.len() - position) as u64 {
    return false;
  }

  for _ in 0..count {
    let Some(length) = compact_size(bytes, &mut position) else {
      return false;
    };
    if length > (bytes.len() - position) as u64 {
      return false;
    }
    position += length as usize;
  }

  true
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
/// Simple proofs are restricted to native SegWit outputs. Nested and legacy
/// P2SH outputs require the full format because their spends also need a
/// `scriptSig`.
pub fn verify_simple(
  address: &Address,
  message: impl AsRef<[u8]>,
  signature: Witness,
) -> Verification {
  if matches!(address.to_address_data(), AddressData::P2sh { .. }) {
    return Verification::Invalid(Error::UnsupportedAddress {
      address: address.to_string(),
    });
  }

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

  match verify_input(&to_sign, &[challenge_prevout], 0) {
    Ok(InputVerification::Valid) => {
      // Upgradeable rules are considered only after every required rule.
      if !matches!(to_sign.version, Version(0) | Version(2)) {
        Verification::Inconclusive
      } else {
        Verification::Valid {
          time: to_sign.lock_time,
          age: to_sign.input[0].sequence,
        }
      }
    }
    Ok(InputVerification::Inconclusive) => Verification::Inconclusive,
    Ok(InputVerification::Unsupported) => unreachable!("unsupported inputs use the interpreter"),
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

  to_sign.weight() <= bitcoin::Weight::MAX_BLOCK
    && to_sign.input.len() == 1
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
  // present it must be UTF-8 and match the message.
  if let Some(val) = psbt.unknown.get(&msg_key) {
    if std::str::from_utf8(val).is_err() || val != message.as_ref() {
      return Verification::Invalid(Error::ToSignInvalid);
    }
  }

  let to_spend = create_to_spend(address, &message);
  let to_spend_outpoint = OutPoint {
    txid: to_spend.compute_txid(),
    vout: 0,
  };

  let unsigned_tx = &psbt.unsigned_tx;

  if unsigned_tx.input.len() < 2 || unsigned_tx.input[0].previous_output != to_spend_outpoint {
    return Verification::Invalid(Error::ToSignInvalid);
  }
  if let Err(error) = validate_psbt_structure(&psbt) {
    return Verification::Invalid(error);
  }

  let op_return = ScriptBuf::builder()
    .push_opcode(opcodes::all::OP_RETURN)
    .into_script();
  if unsigned_tx.output.len() != 1
    || unsigned_tx.output[0].script_pubkey != op_return
    || unsigned_tx.output[0].value != Amount::ZERO
    || unsigned_tx.weight() > bitcoin::Weight::MAX_BLOCK
  {
    return Verification::Invalid(Error::ToSignInvalid);
  }

  let resolver = match PrevoutResolver::new(&psbt) {
    Ok(resolver) => resolver,
    Err(error) => return Verification::Invalid(error),
  };
  let mut all_prevouts = Vec::with_capacity(unsigned_tx.input.len());
  for index in 0..unsigned_tx.input.len() {
    let prevout = match resolver.resolve(index) {
      Ok(prevout) => prevout,
      Err(error) => return Verification::Invalid(error),
    };

    if index == 0 && prevout != to_spend.output[0] {
      return Verification::Invalid(Error::ToSignInvalid);
    }

    // BIP174 requires the full previous transaction for every legacy input.
    // It may be inherited from an earlier input spending the same transaction.
    let final_script_sig = psbt.inputs[index]
      .final_script_sig
      .as_deref()
      .unwrap_or(&unsigned_tx.input[index].script_sig);
    if !is_segwit_spend(&prevout.script_pubkey, final_script_sig)
      && !resolver.has_non_witness(index)
    {
      return Verification::Invalid(Error::ToSignInvalid);
    }

    all_prevouts.push(prevout);
  }

  let to_sign = psbt.extract_tx_unchecked_fee_rate();
  if to_sign.weight() > bitcoin::Weight::MAX_BLOCK {
    return Verification::Invalid(Error::ToSignInvalid);
  }

  // Required rules take precedence over every upgradeable rule.
  if spends_codeseparator(&to_sign, &all_prevouts) {
    return Verification::Invalid(Error::CodeSeparator);
  }

  let mut inconclusive = false;
  for input_index in 0..to_sign.input.len() {
    match verify_input(&to_sign, &all_prevouts, input_index) {
      Ok(InputVerification::Valid) => {}
      Ok(InputVerification::Inconclusive) => inconclusive = true,
      Ok(InputVerification::Unsupported) => unreachable!("unsupported inputs use the interpreter"),
      Err(error) => return Verification::Invalid(error),
    }
  }

  if inconclusive || !matches!(to_sign.version, Version(0) | Version(2)) {
    return Verification::Inconclusive;
  }

  Verification::Valid {
    time: to_sign.lock_time,
    age: to_sign.input[0].sequence,
  }
}

fn is_segwit_spend(script_pubkey: &Script, script_sig: &Script) -> bool {
  if script_pubkey.is_witness_program() {
    return true;
  }

  script_pubkey.is_p2sh()
    && script_sig
      .instructions_minimal()
      .last()
      .is_some_and(|instruction| {
        matches!(instruction, Ok(Instruction::PushBytes(program))
          if Script::from_bytes(program.as_bytes()).is_witness_program())
      })
}

/// Verifies input.
fn verify_input(
  to_sign: &Transaction,
  prevouts: &[TxOut],
  input_index: usize,
) -> Result<InputVerification> {
  let script_pubkey = &prevouts[input_index].script_pubkey;
  if input_has_naked_zero_timelock(to_sign, prevouts, input_index) {
    return Err(Error::ScriptNotSatisfied);
  }
  if script_pubkey.witness_version().is_some_and(|version| {
    version != bitcoin::WitnessVersion::V0 && version != bitcoin::WitnessVersion::V1
  }) {
    if !to_sign.input[input_index].script_sig.is_empty() {
      return Err(Error::ToSignInvalid);
    }
    return Ok(InputVerification::Inconclusive);
  }

  match verify_standard_script(to_sign, prevouts, input_index)? {
    InputVerification::Unsupported => verify_with_interpreter(to_sign, prevouts, input_index),
    valid => Ok(valid),
  }
}

/// Miniscript's type-erased interpreter can treat a naked `older(0)` or
/// `after(0)` fragment as satisfied even though the executed script leaves a
/// false zero on top of the stack. Reject those exact known-invalid scripts.
fn input_has_naked_zero_timelock(
  to_sign: &Transaction,
  prevouts: &[TxOut],
  input_index: usize,
) -> bool {
  fn is_naked_zero_timelock(script: &Script) -> bool {
    let mut instructions = script.instructions();
    matches!(
      (instructions.next(), instructions.next(), instructions.next()),
      (
        Some(Ok(Instruction::PushBytes(empty))),
        Some(Ok(Instruction::Op(opcode))),
        None
      ) if empty.is_empty()
        && (opcode == opcodes::all::OP_CSV || opcode == opcodes::all::OP_CLTV)
    )
  }

  let txin = &to_sign.input[input_index];
  let script_pubkey = &prevouts[input_index].script_pubkey;
  if is_naked_zero_timelock(script_pubkey) {
    return true;
  }

  if script_pubkey.is_p2sh()
    && txin
      .script_sig
      .instructions_minimal()
      .last()
      .is_some_and(|instruction| {
        matches!(instruction, Ok(Instruction::PushBytes(redeem))
          if is_naked_zero_timelock(Script::from_bytes(redeem.as_bytes())))
      })
  {
    return true;
  }

  if (script_pubkey.is_p2wsh() || script_pubkey.is_p2sh())
    && txin.witness.last().is_some_and(|witness_script| {
      let witness_script = Script::from_bytes(witness_script);
      let program = ScriptBuf::new_p2wsh(&witness_script.wscript_hash());
      (script_pubkey == &program || script_pubkey == &ScriptBuf::new_p2sh(&program.script_hash()))
        && is_naked_zero_timelock(witness_script)
    })
  {
    return true;
  }

  if script_pubkey.is_p2tr() {
    let items: Vec<&[u8]> = txin.witness.iter().collect();
    if items.len() >= 2 {
      let mut control_index = items.len() - 1;
      if items[control_index].first() == Some(&0x50) {
        control_index -= 1;
      }
      let control = items[control_index];
      return control_index >= 1
        && control.first().is_some_and(|byte| byte & 0xfe == 0xc0)
        && is_naked_zero_timelock(Script::from_bytes(items[control_index - 1]));
    }
  }

  false
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
  let secp = Secp256k1::verification_only();
  let prevouts_all = sighash::Prevouts::All(prevouts);

  let interpreter = match Interpreter::from_txdata(
    &prevout.script_pubkey,
    &txin.script_sig,
    &txin.witness,
    txin.sequence,
    to_sign.lock_time,
  ) {
    Ok(interpreter) => interpreter,
    Err(miniscript::interpreter::Error::Miniscript(_))
    | Err(miniscript::interpreter::Error::TapAnnexUnsupported) => {
      return Ok(InputVerification::Inconclusive)
    }
    Err(miniscript::interpreter::Error::PubkeyParseError)
    | Err(miniscript::interpreter::Error::XOnlyPublicKeyParseError)
      if prevout.script_pubkey.is_p2tr() && taproot_witness_has_unknown_key(txin) =>
    {
      return Ok(InputVerification::Inconclusive)
    }
    Err(_) => return Err(Error::ScriptNotSatisfied),
  };

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
          if signature.sighash_type == TapSighashType::Default
            && has_explicit_default_taproot_signature(txin, &signature)
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

fn taproot_witness_has_unknown_key(txin: &TxIn) -> bool {
  use bitcoin::hashes::{hash160, Hash};

  let Some(tapscript) = txin
    .witness
    .iter()
    .nth(txin.witness.len().saturating_sub(2))
    .map(Script::from_bytes)
  else {
    return false;
  };

  txin
    .witness
    .iter()
    .take(txin.witness.len().saturating_sub(2))
    .any(|item| {
      !item.is_empty()
        && item.len() != 32
        && tapscript
          .as_bytes()
          .windows(20)
          .any(|window| window == &hash160::Hash::hash(item).to_byte_array()[..])
    })
}

fn has_explicit_default_taproot_signature(
  txin: &TxIn,
  signature: &bitcoin::taproot::Signature,
) -> bool {
  txin
    .witness
    .iter()
    .take(txin.witness.len().saturating_sub(2))
    .any(|item| item.len() == 65 && item[64] == 0 && item[..64] == signature.signature.as_ref()[..])
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
      Some(program) if Script::from_bytes(program).is_witness_program() => {
        if *script_sig != push_only_script(&ScriptBuf::from_bytes(program.to_vec())) {
          return Err(Error::ToSignInvalid);
        }
        Ok(InputVerification::Inconclusive)
      }
      None if !to_sign.input[input_index].witness.is_empty() => Err(Error::ToSignInvalid),
      _ => verify_full_p2sh_multisig(to_sign, prevout, input_index),
    }
  } else if spk.is_p2pkh() {
    verify_full_p2pkh(to_sign, prevout, input_index)
  } else {
    Ok(InputVerification::Unsupported)
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
    if *script_sig != push_only_script(&p2wpkh_script) {
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

fn parse_taproot_signature(encoded: &[u8]) -> Result<(Signature, TapSighashType)> {
  let (signature, sighash_type) = match encoded.len() {
    65 if encoded[64] == 0 => {
      // BIP341: SIGHASH_DEFAULT is valid only in the 64-byte form.
      return Err(Error::SigHashTypeUnsupported {
        sighash_type: TapSighashType::Default.to_string(),
      });
    }
    65 => (
      Signature::from_slice(&encoded[..64]).context(error::SignatureInvalid)?,
      TapSighashType::from_consensus_u8(encoded[64]).context(error::SigHashTypeInvalid)?,
    ),
    64 => (
      Signature::from_slice(encoded).context(error::SignatureInvalid)?,
      TapSighashType::Default,
    ),
    _ => {
      return Err(Error::SignatureLength {
        length: encoded.len(),
        encoded_signature: encoded.to_vec(),
      })
    }
  };

  if sighash_type != TapSighashType::All && sighash_type != TapSighashType::Default {
    return Err(Error::SigHashTypeUnsupported {
      sighash_type: sighash_type.to_string(),
    });
  }

  Ok((signature, sighash_type))
}

fn verify_full_p2tr(
  to_sign: &Transaction,
  prevouts: &[TxOut],
  input_index: usize,
) -> Result<InputVerification> {
  use bitcoin::taproot::{ControlBlock, LeafVersion, TAPROOT_ANNEX_PREFIX};

  let prevout = &prevouts[input_index];
  let pub_key = XOnlyPublicKey::from_slice(&prevout.script_pubkey.as_bytes()[2..])
    .map_err(|_| Error::InvalidPublicKey)?;
  let txin = &to_sign.input[input_index];

  if !txin.script_sig.is_empty() {
    return Err(Error::ToSignInvalid);
  }
  if txin.witness.is_empty() {
    return Err(Error::WitnessEmpty);
  }

  let items: Vec<&[u8]> = txin.witness.iter().collect();
  let has_annex = items.len() >= 2
    && items
      .last()
      .and_then(|item| item.first())
      .is_some_and(|prefix| *prefix == TAPROOT_ANNEX_PREFIX);
  let spend_len = items.len() - usize::from(has_annex);

  if spend_len == 1 {
    let (signature, sighash_type) = parse_taproot_signature(items[0])?;
    let annex = has_annex
      .then(|| sighash::Annex::new(items[items.len() - 1]))
      .transpose()
      .map_err(|_| Error::InvalidWitness)?;

    let sighash = SighashCache::new(to_sign)
      .taproot_signature_hash(
        input_index,
        &sighash::Prevouts::All(prevouts),
        annex,
        None,
        sighash_type,
      )
      .map_err(|_| Error::ToSignInvalid)?;
    let message = Message::from_digest(sighash.to_byte_array());
    Secp256k1::verification_only()
      .verify_schnorr(&signature, &message, &pub_key)
      .context(error::SignatureInvalid)?;

    return Ok(if has_annex {
      InputVerification::Inconclusive
    } else {
      InputVerification::Valid
    });
  }

  let control_bytes = items[spend_len - 1];
  let tapscript = Script::from_bytes(items[spend_len - 2]);
  if control_bytes.len() < 33
    || control_bytes.len() > 33 + 32 * 128
    || (control_bytes.len() - 33) % 32 != 0
  {
    return Err(Error::InvalidWitness);
  }

  let control = ControlBlock::decode(control_bytes).map_err(|_| Error::InvalidWitness)?;
  if !control.verify_taproot_commitment(&Secp256k1::verification_only(), pub_key, tapscript) {
    return Err(Error::ScriptNotSatisfied);
  }

  if control.leaf_version != LeafVersion::TapScript {
    return Ok(InputVerification::Inconclusive);
  }
  if tapscript
    .instructions_minimal()
    .any(|instruction| instruction.is_err())
  {
    return Err(Error::InvalidWitness);
  }
  if contains_op_success(tapscript) {
    return Ok(InputVerification::Inconclusive);
  }

  match parse_simple_tapscript(tapscript, &items, spend_len)? {
    Some(SimpleTapscript::UnknownKey) => Ok(InputVerification::Inconclusive),
    Some(SimpleTapscript::SingleKey(public_key)) => {
      verify_single_key_tapscript(
        to_sign,
        prevouts,
        input_index,
        &items,
        tapscript,
        public_key,
        has_annex,
      )?;
      Ok(if has_annex {
        InputVerification::Inconclusive
      } else {
        InputVerification::Valid
      })
    }
    None if has_annex => Ok(InputVerification::Inconclusive),
    None => Ok(InputVerification::Unsupported),
  }
}

enum SimpleTapscript {
  SingleKey(XOnlyPublicKey),
  UnknownKey,
}

/// Parses the single-key TapScript template using BIP322's required minimal
/// push rules. Unknown key types retain BIP342's witness-stack semantics.
fn parse_simple_tapscript(
  tapscript: &Script,
  items: &[&[u8]],
  spend_len: usize,
) -> Result<Option<SimpleTapscript>> {
  if tapscript.is_empty() {
    return Err(Error::ScriptNotSatisfied);
  }

  let mut instructions = tapscript.instructions_minimal();
  let (
    Some(Ok(Instruction::PushBytes(key))),
    Some(Ok(Instruction::Op(opcodes::all::OP_CHECKSIG))),
    None,
  ) = (
    instructions.next(),
    instructions.next(),
    instructions.next(),
  )
  else {
    return Ok(None);
  };

  if spend_len != 3 {
    return Err(Error::InvalidWitness);
  }
  if items[0].is_empty() {
    return Err(Error::ScriptNotSatisfied);
  }
  if key.len() > 520 || items[0].len() > 520 {
    return Err(Error::InvalidWitness);
  }
  if key.is_empty() {
    return Err(Error::ScriptNotSatisfied);
  }
  if key.len() != 32 {
    return Ok(Some(SimpleTapscript::UnknownKey));
  }

  Ok(Some(SimpleTapscript::SingleKey(
    XOnlyPublicKey::from_slice(key.as_bytes()).map_err(|_| Error::InvalidPublicKey)?,
  )))
}

fn verify_single_key_tapscript(
  to_sign: &Transaction,
  prevouts: &[TxOut],
  input_index: usize,
  items: &[&[u8]],
  tapscript: &Script,
  public_key: XOnlyPublicKey,
  has_annex: bool,
) -> Result<()> {
  use bitcoin::taproot::{LeafVersion, TapLeafHash};

  let (signature, sighash_type) = parse_taproot_signature(items[0])?;
  let annex = has_annex
    .then(|| sighash::Annex::new(items[items.len() - 1]))
    .transpose()
    .map_err(|_| Error::InvalidWitness)?;
  let leaf_hash = TapLeafHash::from_script(tapscript, LeafVersion::TapScript);
  let sighash = SighashCache::new(to_sign)
    .taproot_signature_hash(
      input_index,
      &sighash::Prevouts::All(prevouts),
      annex,
      Some((leaf_hash, 0xffff_ffff)),
      sighash_type,
    )
    .map_err(|_| Error::ToSignInvalid)?;
  Secp256k1::verification_only()
    .verify_schnorr(
      &signature,
      &Message::from_digest(sighash.to_byte_array()),
      &public_key,
    )
    .context(error::SignatureInvalid)?;

  Ok(())
}

fn contains_op_success(script: &Script) -> bool {
  script.instructions().any(|instruction| {
    matches!(instruction, Ok(Instruction::Op(opcode)) if matches!(opcode.to_u8(),
      80 | 98 | 126..=129 | 131..=134 | 137..=138 | 141..=142 | 149..=153 | 187..=254))
  })
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
    return Ok(InputVerification::Unsupported);
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
  if !to_sign.input[input_index].witness.is_empty() {
    return Err(Error::InvalidWitness);
  }

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
  if redeem_bytes.len() > 520 {
    return Err(Error::InvalidWitness);
  }
  let redeem_script = ScriptBuf::from_bytes(redeem_bytes.clone());

  if prevout.script_pubkey != ScriptBuf::new_p2sh(&redeem_script.script_hash()) {
    return Err(Error::ToSignInvalid);
  }

  let Ok((required_signatures, pubkeys)) = parse_multisig(&redeem_script) else {
    return Ok(InputVerification::Unsupported);
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
