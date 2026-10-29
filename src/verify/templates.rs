use super::*;

/// Verifies the standard script types by template. Returns `Unsupported` for
/// anything else, which [`verify_input`] hands to the interpreter.
pub(crate) fn verify_standard_script(
  spend: &Spend,
  sighash_cache: &mut SighashCache<&Transaction>,
) -> Result<InputVerification> {
  let spk = &spend.prevout.script_pubkey;

  if spk.is_p2tr() {
    verify_full_p2tr(spend, sighash_cache)
  } else if let Some(witness) = &spend.witness_program {
    match (witness.version, witness.program.len()) {
      (bitcoin::WitnessVersion::V0, 20) => verify_full_p2wpkh(spend, sighash_cache),
      (bitcoin::WitnessVersion::V0, 32) => verify_full_p2wsh(spend, sighash_cache),
      _ => Ok(InputVerification::Unsupported),
    }
  } else if spk.is_p2sh() {
    verify_full_p2sh_multisig(spend, sighash_cache)
  } else if spk.is_p2pkh() {
    verify_full_p2pkh(spend, sighash_cache)
  } else {
    Ok(InputVerification::Unsupported)
  }
}

fn verify_full_p2wpkh(
  spend: &Spend,
  sighash_cache: &mut SighashCache<&Transaction>,
) -> Result<InputVerification> {
  let witness = &spend.txin.witness;

  if witness.is_empty() {
    return Err(Error::WitnessEmpty);
  }

  if witness.len() != 2 {
    return Err(Error::InvalidWitness);
  }

  let items = witness.to_vec();
  let encoded_signature = items[0].clone();
  let witness_pub_key = &items[1];

  let pub_key = PublicKey::from_slice(witness_pub_key).map_err(|_| Error::InvalidPublicKey)?;

  let wpubkey_hash = pub_key
    .wpubkey_hash()
    .context(error::UncompressedPublicKey)?;

  let p2wpkh_script = ScriptBuf::new_p2wpkh(&wpubkey_hash);

  if spend
    .witness_program
    .as_ref()
    .expect("dispatched by witness")
    .program
    != wpubkey_hash.to_byte_array()
  {
    return Err(Error::PublicKeyMismatch);
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

  if sighash_type != EcdsaSighashType::All {
    return Err(Error::SigHashTypeUnsupported {
      sighash_type: sighash_type.to_string(),
    });
  }

  let sighash = sighash_cache
    .p2wpkh_signature_hash(
      spend.input_index,
      &p2wpkh_script,
      spend.prevout.value,
      sighash_type,
    )
    .expect("signature hash should compute");

  let message =
    Message::from_digest_slice(sighash.as_ref()).expect("should be cryptographically secure hash");

  Secp256k1::verification_only()
    .verify_ecdsa(&message, &signature, &pub_key.inner)
    .context(error::SignatureInvalid)?;

  Ok(InputVerification::Valid)
}

/// Verify a BIP-322 proof for a P2WSH
fn verify_full_p2wsh(
  spend: &Spend,
  sighash_cache: &mut SighashCache<&Transaction>,
) -> Result<InputVerification> {
  let witness_items = spend.txin.witness.to_vec();

  if witness_items.is_empty() {
    return Err(Error::InvalidWitness);
  }

  let witness_script = spend.witness_script.ok_or(Error::ToSignInvalid)?;
  if witness_script.wscript_hash().to_byte_array().as_slice()
    != spend
      .witness_program
      .as_ref()
      .expect("dispatched by witness")
      .program
  {
    return Err(Error::ToSignInvalid);
  }

  let Ok((required_signatures, pubkeys)) = parse_multisig(witness_script) else {
    return Ok(InputVerification::Unsupported);
  };

  if witness_items.len() < 3 || !witness_items[0].is_empty() {
    return Err(Error::InvalidWitness);
  }

  let signatures = &witness_items[1..witness_items.len() - 1];
  if signatures.len() != required_signatures {
    return Err(Error::InvalidWitness);
  }

  let sighash = sighash_cache
    .p2wsh_signature_hash(
      spend.input_index,
      witness_script,
      spend.prevout.value,
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
  spend: &Spend,
  sighash_cache: &mut SighashCache<&Transaction>,
) -> Result<InputVerification> {
  let p2sh = spend.p2sh.as_ref().expect("dispatched by P2SH");
  let Some((redeem_bytes, sig_pushes)) = p2sh.pushes.split_last() else {
    return Err(Error::InvalidWitness);
  };
  let redeem_script = Script::from_bytes(redeem_bytes);

  let Ok((required_signatures, pubkeys)) = parse_multisig(redeem_script) else {
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

  let sighash = sighash_cache
    .legacy_signature_hash(
      spend.input_index,
      redeem_script,
      EcdsaSighashType::All.to_u32(),
    )
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
  spend: &Spend,
  sighash_cache: &mut SighashCache<&Transaction>,
) -> Result<InputVerification> {
  // scriptSig: <sig> <pubkey>
  let mut instructions = spend.txin.script_sig.instructions_minimal();
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

  if spend.prevout.script_pubkey != ScriptBuf::new_p2pkh(&pub_key.pubkey_hash()) {
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

  let sighash = sighash_cache
    .legacy_signature_hash(
      spend.input_index,
      &spend.prevout.script_pubkey,
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
