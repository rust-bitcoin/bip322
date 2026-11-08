use super::*;
use miniscript::interpreter::{
  Error as InterpreterError, Interpreter, KeySigPair, SatisfiedConstraint,
};

/// Fallback verification via the miniscript interpreter for scripts the
/// templates cannot classify.
///
/// Returns `Inconclusive` even when the interpreter fully satisfies the spend,
/// because only the dedicated templates can establish full consensus validity.
/// It still returns `Invalid` when the interpreter proves a required-rule
/// failure.
pub(crate) fn verify_with_interpreter(spend: &Spend) -> Result<InputVerification> {
  let secp = Secp256k1::verification_only();
  let txin = spend.txin();

  // If the interpreter cannot even parse the spend, we cannot verify it.
  // Report Inconclusive rather than turning an unsupported script shape into a
  // required-rule failure.
  let Ok(interpreter) = Interpreter::from_txdata(
    &spend.prevout().script_pubkey,
    &txin.script_sig,
    &txin.witness,
    txin.sequence,
    spend.to_sign().lock_time,
  ) else {
    return Ok(InputVerification::Inconclusive);
  };

  for result in interpreter.iter(
    &secp,
    spend.to_sign(),
    spend.input_index(),
    &sighash::Prevouts::All(spend.prevouts()),
  ) {
    match result {
      Ok(SatisfiedConstraint::PublicKey { key_sig })
      | Ok(SatisfiedConstraint::PublicKeyHash { key_sig, .. }) => {
        check_required_signature(key_sig, spend)?
      }
      Ok(SatisfiedConstraint::AbsoluteTimelock { .. })
        if spend.txin().sequence == Sequence::MAX =>
      {
        return Err(Error::ScriptNotSatisfied)
      }
      Ok(SatisfiedConstraint::RelativeTimelock { .. }) if spend.to_sign().version < Version(2) => {
        return Err(Error::ScriptNotSatisfied)
      }
      Ok(_) => {}
      Err(error) => match required_rule_failure(error) {
        Some(error) => return Err(error),
        None => return Ok(InputVerification::Inconclusive),
      },
    }
  }

  Ok(InputVerification::Inconclusive)
}

/// Maps an interpreter error to the required-rule failure it proves. Unsupported
/// or ambiguous evaluation returns `None` and stays inconclusive.
fn required_rule_failure(error: InterpreterError) -> Option<Error> {
  match error {
    InterpreterError::AbsoluteLockTimeNotMet(_)
    | InterpreterError::AbsoluteLockTimeComparisonInvalid(_, _)
    | InterpreterError::RelativeLockTimeNotMet(_)
    | InterpreterError::RelativeLockTimeDisabled(_)
    | InterpreterError::ExpectedPush
    | InterpreterError::HashPreimageLengthMismatch
    | InterpreterError::InsufficientSignaturesMultiSig
    | InterpreterError::MissingExtraZeroMultiSig
    | InterpreterError::MultiSigEvaluationError
    | InterpreterError::PkHashVerifyFail(_)
    | InterpreterError::ScriptSatisfactionError
    | InterpreterError::UnexpectedStackEnd
    | InterpreterError::VerifyFailed => Some(Error::ScriptNotSatisfied),
    InterpreterError::EcdsaSig(_)
    | InterpreterError::InvalidEcdsaSignature(_)
    | InterpreterError::InvalidSchnorrSignature(_)
    | InterpreterError::InvalidSchnorrSighashType(_)
    | InterpreterError::NonStandardSighash(_)
    | InterpreterError::PkEvaluationError(_)
    | InterpreterError::SchnorrSig(_)
    | InterpreterError::Secp(_) => Some(Error::SignatureInvalid {
      source: bitcoin::secp256k1::Error::IncorrectSignature,
    }),
    InterpreterError::SighashError(source) => Some(Error::SigHashTypeInvalid { source }),
    InterpreterError::ControlBlockParse(_)
    | InterpreterError::ControlBlockVerificationError
    | InterpreterError::IncorrectPubkeyHash
    | InterpreterError::IncorrectScriptHash
    | InterpreterError::IncorrectWPubkeyHash
    | InterpreterError::IncorrectWScriptHash
    | InterpreterError::NonEmptyWitness
    | InterpreterError::NonEmptyScriptSig
    | InterpreterError::UnexpectedStackBoolean
    | InterpreterError::UnexpectedStackElementPush => Some(Error::InvalidWitness),
    InterpreterError::PubkeyParseError
    | InterpreterError::XOnlyPublicKeyParseError
    | InterpreterError::UncompressedPubkey => Some(Error::InvalidPublicKey),
    InterpreterError::CannotInferTrDescriptors
    | InterpreterError::CouldNotEvaluate
    | InterpreterError::Miniscript(_)
    | InterpreterError::TapAnnexUnsupported => None,
  }
}

/// Enforces the BIP-322 required signature rules for a signature the script
/// interpreter has identified.
fn check_required_signature(key_sig: KeySigPair, spend: &Spend) -> Result<()> {
  match key_sig {
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
        && has_explicit_default_taproot_signature(spend, &signature)
      {
        return Err(Error::SigHashTypeUnsupported {
          sighash_type: signature.sighash_type.to_string(),
        });
      }
    }
  }
  Ok(())
}

/// Runs the BIP-322 required checks on an annexed tapscript that no template
/// matches, which the interpreter rejects outright. The annex is stripped only
/// for script parsing; the verdict stays `Inconclusive` because the annex is an
/// upgradeable rule.
pub(crate) fn verify_taproot_annex_required_rules(spend: &Spend) -> Result<()> {
  let txin = spend.txin();

  let mut witness = Witness::new();
  for item in txin
    .witness
    .iter()
    .take(txin.witness.len().saturating_sub(1))
  {
    witness.push(item);
  }

  let Ok(interpreter) = Interpreter::from_txdata(
    &spend.prevout().script_pubkey,
    &txin.script_sig,
    &witness,
    txin.sequence,
    spend.to_sign().lock_time,
  ) else {
    return Ok(());
  };

  for result in interpreter.iter_assume_sigs() {
    match result {
      Ok(SatisfiedConstraint::PublicKey { key_sig })
      | Ok(SatisfiedConstraint::PublicKeyHash { key_sig, .. }) => {
        check_required_signature(key_sig, spend)?
      }
      Ok(SatisfiedConstraint::AbsoluteTimelock { .. }) if txin.sequence == Sequence::MAX => {
        return Err(Error::ScriptNotSatisfied)
      }
      Ok(SatisfiedConstraint::RelativeTimelock { .. }) if spend.to_sign().version < Version(2) => {
        return Err(Error::ScriptNotSatisfied)
      }
      Ok(_) => {}
      Err(error) => {
        if let Some(error) = required_rule_failure(error) {
          return Err(error);
        }
        return Ok(());
      }
    }
  }

  Ok(())
}

fn has_explicit_default_taproot_signature(
  spend: &Spend,
  signature: &bitcoin::taproot::Signature,
) -> bool {
  spend
    .taproot_stack()
    .any(|item| item.len() == 65 && item[64] == 0 && item[..64] == signature.signature.as_ref()[..])
}
