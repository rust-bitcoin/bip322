use super::*;
use miniscript::interpreter::{Interpreter, KeySigPair, SatisfiedConstraint};

/// Fallback verification via the miniscript interpreter for scripts the
/// templates cannot classify.
///
/// Returns `Inconclusive` when the interpreter cannot parse the spend, so a
/// script this validator does not understand is neither accepted nor rejected.
pub(crate) fn verify_with_interpreter(
  to_sign: &Transaction,
  spend: &Spend,
) -> Result<InputVerification> {
  let secp = Secp256k1::verification_only();
  let prevouts_all = sighash::Prevouts::All(spend.prevouts);

  // If the interpreter cannot even parse the spend, we cannot verify it.
  // Report Inconclusive rather than turning an unsupported script shape into a
  // required-rule failure.
  let Ok(interpreter) = Interpreter::from_txdata(
    &spend.prevout.script_pubkey,
    &spend.txin.script_sig,
    &spend.txin.witness,
    spend.txin.sequence,
    to_sign.lock_time,
  ) else {
    return Ok(InputVerification::Inconclusive);
  };

  for result in interpreter.iter(&secp, to_sign, spend.input_index, &prevouts_all) {
    match result {
      Ok(SatisfiedConstraint::PublicKey { key_sig })
      | Ok(SatisfiedConstraint::PublicKeyHash { key_sig, .. }) => {
        check_required_signature(key_sig, spend.taproot_initial_stack())?
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
fn check_required_signature(key_sig: KeySigPair, initial_stack: &[&[u8]]) -> Result<()> {
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
        && has_explicit_default_taproot_signature(initial_stack, &signature)
      {
        return Err(Error::SigHashTypeUnsupported {
          sighash_type: signature.sighash_type.to_string(),
        });
      }
    }
  }
  Ok(())
}

/// Runs the BIP-322 required checks on an annexed Taproot script that the
/// normal interpreter path rejects outright. The annex is stripped only for
/// script parsing; the final verdict remains `Inconclusive` because annex is an
/// upgradeable rule.
pub(crate) fn verify_taproot_annex_required_rules(
  to_sign: &Transaction,
  spend: &Spend,
) -> Result<()> {
  let Some(taproot) = spend.taproot.as_ref() else {
    return Ok(());
  };
  if taproot.annex.is_none() {
    return Ok(());
  }

  let mut items: Vec<&[u8]> = spend.txin.witness.iter().collect();
  if items.len() < 2 {
    return Ok(());
  }
  items.pop();

  let witness = Witness::from_slice(&items);
  let Ok(interpreter) = Interpreter::from_txdata(
    &spend.prevout.script_pubkey,
    &spend.txin.script_sig,
    &witness,
    spend.txin.sequence,
    to_sign.lock_time,
  ) else {
    return Ok(());
  };

  for result in interpreter.iter_assume_sigs() {
    match result {
      Ok(SatisfiedConstraint::PublicKey { key_sig })
      | Ok(SatisfiedConstraint::PublicKeyHash { key_sig, .. }) => {
        // Sighash-type failures are required-rule failures we can detect
        // without verifying the signature itself.
        check_required_signature(key_sig, spend.taproot_initial_stack())?
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
  initial_stack: &[&[u8]],
  signature: &bitcoin::taproot::Signature,
) -> bool {
  initial_stack
    .iter()
    .any(|item| item.len() == 65 && item[64] == 0 && item[..64] == signature.signature.as_ref()[..])
}
