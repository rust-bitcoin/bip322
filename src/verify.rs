use super::*;

mod decode;
mod interpreter;
mod legacy;
mod spend;
mod taproot;
mod templates;

pub use self::legacy::*;
use self::{decode::*, interpreter::*, spend::*, taproot::*, templates::*};

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

/// Verifies the BIP-322 simple from spec-compliant string encodings.
///
/// A malformed encoding is reported as [`Verification::Invalid`], like any
/// other failed check — the return value is always the verdict.
pub fn verify_simple_encoded(address: &str, message: &str, signature: &str) -> Verification {
  decode_simple(address, signature)
    .map(|(address, witness)| verify_simple(&address, message, witness))
    .unwrap_or_else(Verification::Invalid)
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

  let spend = Spend::parse(&to_sign, std::slice::from_ref(&challenge_prevout), 0);

  // Required rules take precedence over upgradeable rules and interpretation.
  if spend.spends_codeseparator() {
    return Verification::Invalid(Error::CodeSeparator);
  }

  let mut sighash_cache = SighashCache::new(&to_sign);
  match verify_input(&to_sign, &spend, &mut sighash_cache) {
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

  let op_return = bitcoin::script::Builder::new()
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

    all_prevouts.push(prevout);
  }

  let has_non_witness: Vec<bool> = (0..unsigned_tx.input.len())
    .map(|index| resolver.has_non_witness(index))
    .collect();
  let to_sign = psbt.extract_tx_unchecked_fee_rate();
  if to_sign.weight() > bitcoin::Weight::MAX_BLOCK {
    return Verification::Invalid(Error::ToSignInvalid);
  }

  let spends: Vec<Spend> = (0..to_sign.input.len())
    .map(|input_index| Spend::parse(&to_sign, &all_prevouts, input_index))
    .collect();

  // BIP174 requires the full previous transaction for every legacy input. It
  // may be inherited from an earlier input spending the same transaction.
  for spend in &spends {
    if spend.witness_program.is_none() && !has_non_witness[spend.input_index] {
      return Verification::Invalid(Error::ToSignInvalid);
    }
  }

  // Required rules take precedence over every upgradeable rule.
  if spends.iter().any(Spend::spends_codeseparator) {
    return Verification::Invalid(Error::CodeSeparator);
  }

  // Legacy and third-party interpreter sighashes can require quadratic work.
  // Bound verification effort and report larger proofs as unverifiable rather
  // than returning a required-rule failure. Taproot commitment verification is
  // deliberately lazy, so this check runs before any elliptic-curve work.
  if spends.len() > MAX_PROOF_INPUTS {
    return Verification::Inconclusive;
  }

  let mut sighash_cache = SighashCache::new(&to_sign);
  let mut inconclusive = false;
  for spend in &spends {
    match verify_input(&to_sign, spend, &mut sighash_cache) {
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

/// Verifies input.
fn verify_input(
  to_sign: &Transaction,
  spend: &Spend,
  sighash_cache: &mut SighashCache<&Transaction>,
) -> Result<InputVerification> {
  if spend.has_naked_zero_timelock() {
    return Err(Error::ScriptNotSatisfied);
  }
  spend.validate_structure()?;

  if spend.witness_program.as_ref().is_some_and(|witness| {
    (witness.nested && witness.version != bitcoin::WitnessVersion::V0)
      || (!witness.nested
        && ((witness.version == bitcoin::WitnessVersion::V1 && witness.program.len() != 32)
          || (witness.version != bitcoin::WitnessVersion::V0
            && witness.version != bitcoin::WitnessVersion::V1)))
  }) {
    return Ok(InputVerification::Inconclusive);
  }

  if spend
    .taproot
    .as_ref()
    .is_some_and(|taproot| taproot.annex.is_some())
  {
    verify_taproot_annex_required_rules(to_sign, spend)?;
  }

  match verify_standard_script(spend, sighash_cache)? {
    InputVerification::Unsupported => verify_with_interpreter(to_sign, spend),
    valid => Ok(valid),
  }
}
