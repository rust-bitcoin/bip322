use super::*;
use miniscript::interpreter::{Interpreter, KeySigPair, SatisfiedConstraint};

/// Fallback verification via the miniscript interpreter for scripts the
/// templates cannot classify.
///
/// Returns `Inconclusive` when the interpreter cannot parse the spend, so a
/// script this validator does not understand is neither accepted nor rejected.
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
        // Sighash-type failures are required-rule failures we can detect
        // without verifying the signature itself.
        check_required_signature(key_sig, spend)?
      }
      Ok(_) => {}
      // Signature verification is unavailable with the annex present. Do not
      // turn an approximate evaluation into a required-rule failure.
      Err(_) => return Ok(()),
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
