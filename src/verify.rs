use super::*;

mod bound;
mod decode;
mod interpreter;
mod legacy;
pub(crate) mod preflight;
mod spend;
mod taproot;
mod templates;

pub use self::legacy::*;
use self::{bound::*, decode::*, interpreter::*, spend::*, taproot::*, templates::*};

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
/// other failed check — the return value is always the verdict. A proof with
/// more than [`MAX_PROOF_INPUTS`] inputs is [`Verification::Inconclusive`]
/// without being decoded, as [`verify_pof`] reports it.
pub fn verify_pof_encoded(address: &str, message: &str, to_sign: &str) -> Verification {
  match decode_pof(address, to_sign) {
    Ok(Some((address, psbt))) => verify_pof(&address, message, psbt),
    Ok(None) => Verification::Inconclusive,
    Err(error) => Verification::Invalid(error),
  }
}

/// Verifies the BIP-322 simple format.
///
/// Simple proofs are restricted to native segwit addresses. P2PKH and P2SH
/// addresses require the full format because their spends also need a
/// `scriptSig`.
pub fn verify_simple(
  address: &Address,
  message: impl AsRef<[u8]>,
  signature: Witness,
) -> Verification {
  if let Err(error) = require_simple_format(address) {
    return Verification::Invalid(error);
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

  // The challenge output carries no value, so `to_spend`'s only output is
  // exactly the previous output `to_sign` spends.
  match parse_spends(&to_sign, &to_spend.output) {
    Ok(spends) => verify_spends(&to_sign, &spends),
    Err(error) => Verification::Invalid(error),
  }
}

fn check_to_sign(to_spend: &Transaction, to_sign: &Transaction) -> bool {
  let to_spend_outpoint = OutPoint {
    txid: to_spend.compute_txid(),
    vout: 0,
  };

  to_sign.weight() <= bitcoin::Weight::MAX_BLOCK
    && to_sign.input.len() == 1
    && to_sign.input[0].previous_output == to_spend_outpoint
    && is_bip322_output(&to_sign.output)
}

/// Verifies a BIP-322 full proof of funds.
///
/// Each proven input's previous output is taken from the PSBT's own
/// `witness_utxo`, or from a `non_witness_utxo` on that input or on an
/// earlier input spending the same transaction. An input with neither is
/// rejected. The challenge input is always verified against the challenge
/// output itself; its UTXO data only has to agree with it.
///
/// A proof with more than [`MAX_PROOF_INPUTS`] inputs is
/// [`Verification::Inconclusive`], before any other check.
///
/// Note that the UTXO data is supplied by the prover: verification only
/// checks that it is internally consistent and signed for. Callers must
/// independently confirm on-chain that each outpoint exists with the claimed
/// script and value.
pub fn verify_pof(address: &Address, message: impl AsRef<[u8]>, psbt: Psbt) -> Verification {
  // Legacy and third-party interpreter sighashes can require quadratic work.
  // Bound verification effort and report larger proofs as unverifiable rather
  // than returning a required-rule failure. This runs first, as it does for
  // an encoded proof before decoding, so both get the same verdict.
  if psbt.unsigned_tx.input.len() > MAX_PROOF_INPUTS {
    return Verification::Inconclusive;
  }

  // The message is already a validator input and is bound by to_spend's
  // scriptSig; the PSBT field exists for the signing flow. Official BIP-322
  // proof-of-funds vectors omit it, so it is optional here — but when
  // present it must be UTF-8 and match the message.
  if let Some(val) = psbt.unknown.get(&signed_message_key()) {
    if std::str::from_utf8(val).is_err() {
      return Verification::Invalid(Error::MessageNotUtf8);
    }
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

  if unsigned_tx.input.len() < 2 || unsigned_tx.input[0].previous_output != to_spend_outpoint {
    return Verification::Invalid(Error::ToSignInvalid);
  }
  if let Err(error) = validate_psbt_structure(&psbt) {
    return Verification::Invalid(error);
  }

  if !is_bip322_output(&unsigned_tx.output) || unsigned_tx.weight() > bitcoin::Weight::MAX_BLOCK {
    return Verification::Invalid(Error::ToSignInvalid);
  }

  let resolver = match PrevoutResolver::new(&psbt) {
    Ok(resolver) => resolver,
    Err(error) => return Verification::Invalid(error),
  };

  // The challenge input spends the challenge output, so that is what it is
  // verified against. The PSBT's UTXO data for it only has to agree.
  match resolver.resolve(0) {
    Ok(prevout) if prevout == to_spend.output[0] => {}
    Ok(_) => return Verification::Invalid(Error::ToSignInvalid),
    Err(error) => return Verification::Invalid(error),
  }
  let mut all_prevouts = Vec::with_capacity(unsigned_tx.input.len());
  all_prevouts.push(to_spend.output[0].clone());
  for index in 1..unsigned_tx.input.len() {
    match resolver.resolve(index) {
      Ok(prevout) => all_prevouts.push(prevout),
      Err(error) => return Verification::Invalid(error),
    }
  }

  let has_non_witness: Vec<bool> = (0..unsigned_tx.input.len())
    .map(|index| resolver.has_non_witness(index))
    .collect();
  let to_sign = psbt.extract_tx_unchecked_fee_rate();
  if to_sign.weight() > bitcoin::Weight::MAX_BLOCK {
    return Verification::Invalid(Error::ToSignInvalid);
  }

  let spends = match parse_spends(&to_sign, &all_prevouts) {
    Ok(spends) => spends,
    Err(error) => return Verification::Invalid(error),
  };

  // BIP174 requires the full previous transaction for every legacy input. It
  // may be inherited from an earlier input spending the same transaction.
  if spends
    .iter()
    .any(|spend| !spend.is_witness() && !has_non_witness[spend.input_index()])
  {
    return Verification::Invalid(Error::ToSignInvalid);
  }

  verify_spends(&to_sign, &spends)
}

/// Parses every input of `to_sign` against its previous output in
/// `prevouts`.
fn parse_spends<'a>(to_sign: &'a Transaction, prevouts: &'a [TxOut]) -> Result<Vec<Spend<'a>>> {
  (0..to_sign.input.len())
    .map(|input_index| Spend::parse(to_sign, prevouts, input_index))
    .collect()
}

/// Verifies every input of `to_sign`, the shared tail of the full and
/// proof-of-funds formats.
fn verify_spends(to_sign: &Transaction, spends: &[Spend]) -> Verification {
  let Some(first) = to_sign.input.first() else {
    return Verification::Invalid(Error::ToSignInvalid);
  };

  // Required rules take precedence over upgradeable rules and interpretation.
  if spends.iter().any(Spend::spends_codeseparator) {
    return Verification::Invalid(Error::CodeSeparator);
  }

  let mut sighash_cache = SighashCache::new(to_sign);
  let mut inconclusive = false;
  for spend in spends {
    match verify_input(spend, &mut sighash_cache) {
      Ok(InputVerification::Valid) => {}
      Ok(InputVerification::Inconclusive) => inconclusive = true,
      Err(error) => return Verification::Invalid(error),
    }
  }

  // Upgradeable rules are considered only after every required rule.
  if inconclusive || !matches!(to_sign.version, Version(0) | Version(2)) {
    return Verification::Inconclusive;
  }

  Verification::Valid {
    time: to_sign.lock_time,
    age: first.sequence,
  }
}

/// Verifies input.
fn verify_input(
  spend: &Spend,
  sighash_cache: &mut SighashCache<&Transaction>,
) -> Result<InputVerification> {
  if spend.has_naked_zero_timelock() {
    return Err(Error::ScriptNotSatisfied);
  }

  let verification = match spend.kind() {
    SpendKind::P2pkh(hash) => {
      verify_p2pkh(spend, hash, sighash_cache)?;
      Some(InputVerification::Valid)
    }
    SpendKind::P2sh { redeem, pushes } => {
      verify_p2sh_multisig(spend, *redeem, pushes, sighash_cache)?
    }
    SpendKind::P2wpkh(hash) => {
      verify_p2wpkh(spend, hash, sighash_cache)?;
      Some(InputVerification::Valid)
    }
    SpendKind::P2wsh(witness_script) => {
      verify_p2wsh_multisig(spend, *witness_script, sighash_cache)?
    }
    SpendKind::P2tr {
      output_key,
      annex,
      path,
    } => verify_p2tr(spend, *output_key, *annex, path, sighash_cache)?,
    // Segwit versions reserved for upgrades are an upgradeable rule.
    SpendKind::UnknownWitness => Some(InputVerification::Inconclusive),
    SpendKind::Bare => None,
  };

  match verification {
    Some(verification) => Ok(verification),
    None => verify_with_interpreter(spend),
  }
}
