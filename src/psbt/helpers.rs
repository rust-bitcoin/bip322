use super::*;

pub(crate) fn declared_ecdsa_sighash(input: &bitcoin::psbt::Input) -> Result<EcdsaSighashType> {
  match input.sighash_type {
    None => Ok(EcdsaSighashType::All),
    Some(sighash_type) if sighash_type.to_u32() == EcdsaSighashType::All.to_u32() => {
      Ok(EcdsaSighashType::All)
    }
    Some(sighash_type) => Err(Error::SigHashTypeUnsupported {
      sighash_type: sighash_type.to_u32().to_string(),
    }),
  }
}

pub(crate) fn signing_taproot_sighash(input: &bitcoin::psbt::Input) -> Result<TapSighashType> {
  match input.sighash_type {
    None => Ok(TapSighashType::All),
    Some(sighash_type) if sighash_type.to_u32() == 1 => Ok(TapSighashType::All),
    Some(sighash_type) if sighash_type.to_u32() == 0 => Ok(TapSighashType::Default),
    Some(sighash_type) => Err(Error::SigHashTypeUnsupported {
      sighash_type: sighash_type.to_u32().to_string(),
    }),
  }
}

pub(crate) fn validate_final_taproot_sighash(
  input: &bitcoin::psbt::Input,
  actual: TapSighashType,
) -> Result<()> {
  let valid = matches!(actual, TapSighashType::All | TapSighashType::Default)
    && (input.sighash_type.is_none() || actual == signing_taproot_sighash(input)?);
  if !valid {
    return Err(Error::SigHashTypeUnsupported {
      sighash_type: (actual as u8).to_string(),
    });
  }
  Ok(())
}

pub(crate) fn require_multisig_challenge(
  script: &ScriptBuf,
  challenge: &ScriptBuf,
  is_witness: bool,
  redeem_script: Option<&ScriptBuf>,
) -> Result<()> {
  let p2wsh = ScriptBuf::new_p2wsh(&script.wscript_hash());

  if !is_witness && script.len() > MAX_SCRIPT_ELEMENT_SIZE {
    return Err(Error::InvalidWitness);
  }

  let matches = if is_witness {
    if *challenge == p2wsh {
      redeem_script.is_none()
    } else {
      *challenge == ScriptBuf::new_p2sh(&p2wsh.script_hash()) && redeem_script == Some(&p2wsh)
    }
  } else {
    *challenge == ScriptBuf::new_p2sh(&script.script_hash()) && redeem_script == Some(script)
  };

  if !matches {
    return Err(Error::WitnessScriptMismatch);
  }

  Ok(())
}

/// Takes the partial signature, requiring exactly one whose public key satisfies the challenge.
pub(crate) fn single_partial_sig(
  input: &bitcoin::psbt::Input,
  challenge: &ScriptBuf,
  expected: impl Fn(&PublicKey) -> Result<ScriptBuf>,
) -> Result<(PublicKey, bitcoin::ecdsa::Signature)> {
  if input.partial_sigs.len() != 1 {
    return Err(Error::SignatureCount {
      required: 1,
      provided: input.partial_sigs.len(),
    });
  }

  let (pub_key, signature) = input
    .partial_sigs
    .iter()
    .next()
    .map(|(pub_key, signature)| (*pub_key, *signature))
    .expect("length checked above");

  if expected(&pub_key)? != *challenge {
    return Err(Error::PublicKeyMismatch);
  }

  if signature.sighash_type != declared_ecdsa_sighash(input)? {
    return Err(Error::SigHashTypeUnsupported {
      sighash_type: signature.sighash_type.to_u32().to_string(),
    });
  }

  Ok((pub_key, signature))
}
