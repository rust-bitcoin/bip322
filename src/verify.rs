use super::*;

/// Verifies a BIP-137 legacy proof from string inputs.
#[allow(clippy::result_large_err)]
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
#[allow(clippy::result_large_err)]
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
#[allow(clippy::result_large_err)]
pub fn verify_simple_encoded(address: &str, message: &str, signature: &str) -> Result<()> {
  let address = Address::from_str(address)
    .context(error::AddressParse { address })?
    .assume_checked();

  let mut cursor = bitcoin::io::Cursor::new(
    general_purpose::STANDARD
      .decode(signature)
      .context(error::SignatureDecode { signature })?,
  );

  let witness =
    Witness::consensus_decode_from_finite_reader(&mut cursor).context(error::WitnessMalformed)?;

  verify_simple(&address, message, witness)
}

/// Verifies the BIP-322 full from spec-compliant string encodings.
#[allow(clippy::result_large_err)]
pub fn verify_full_encoded(address: &str, message: &str, to_sign: &str) -> Result<()> {
  let address = Address::from_str(address)
    .context(error::AddressParse { address })?
    .assume_checked();

  let mut cursor = bitcoin::io::Cursor::new(general_purpose::STANDARD.decode(to_sign).context(
    error::TransactionBase64Decode {
      transaction: to_sign,
    },
  )?);

  let to_sign = Transaction::consensus_decode_from_finite_reader(&mut cursor).context(
    error::TransactionConsensusDecode {
      transaction: to_sign,
    },
  )?;

  verify_full(&address, message, to_sign)
}

/// Verifies the BIP-322 simple from proper Rust types.
#[allow(clippy::result_large_err)]
pub fn verify_simple(
  address: &Address,
  message: impl AsRef<[u8]>,
  signature: Witness,
) -> Result<()> {
  verify_full(
    address,
    &message,
    create_to_sign(&create_to_spend(address, &message)?, Some(signature))?
      .extract_tx()
      .context(error::TransactionExtract)?,
  )
}

/// Verifies the BIP-322 full from proper Rust types.
#[allow(clippy::result_large_err)]
pub fn verify_full(
  address: &Address,
  message: impl AsRef<[u8]>,
  to_sign: Transaction,
) -> Result<()> {
  match address.to_address_data() {
    AddressData::Segwit { witness_program }
      if witness_program.version().to_num() == 1 && witness_program.program().len() == 32 =>
    {
      let pub_key = XOnlyPublicKey::from_slice(witness_program.program().as_bytes())
        .map_err(|_| Error::InvalidPublicKey)?;

      verify_full_p2tr(address, message, to_sign, pub_key)
    }
    AddressData::Segwit { witness_program }
      if witness_program.version().to_num() == 0
        && witness_program.program().len() == 32
        && !to_sign.input.is_empty()
        && to_sign.input[0].witness.len() > 2 =>
    {
      verify_full_p2wsh(address, message, to_sign)
    }
    AddressData::Segwit { witness_program }
      if witness_program.version().to_num() == 0
        && witness_program.program().len() == 20
        && !to_sign.input.is_empty()
        && to_sign.input[0].witness.len() > 1 =>
    {
      let pub_key =
        PublicKey::from_slice(&to_sign.input[0].witness[1]).map_err(|_| Error::InvalidPublicKey)?;

      verify_full_p2wpkh(address, message, to_sign, pub_key, false)
    }
    AddressData::P2sh { script_hash: _ } => {
      let input = to_sign.input.first().ok_or(Error::ToSignInvalid)?;
      match input.witness.len() {
        0 => verify_full_p2sh_multisig(address, message, to_sign),
        2 => {
          let pub_key =
            PublicKey::from_slice(&input.witness[1]).map_err(|_| Error::InvalidPublicKey)?;
          verify_full_p2wpkh(address, message, to_sign, pub_key, true)
        }
        n if n > 2 => verify_full_p2wsh(address, message, to_sign),
        _ => Err(Error::InvalidWitness),
      }
    }
    AddressData::P2pkh { pubkey_hash: _ } => verify_full_p2pkh(address, message, to_sign),
    _ => Err(Error::UnsupportedAddress {
      address: address.to_string(),
    }),
  }
}

#[allow(clippy::result_large_err)]
fn check_to_sign(to_spend: &Transaction, to_sign: &Transaction) -> Result<()> {
  let to_spend_outpoint = OutPoint {
    txid: to_spend.compute_txid(),
    vout: 0,
  };

  let op_return = script::Builder::new()
    .push_opcode(opcodes::all::OP_RETURN)
    .into_script();

  if !matches!(to_sign.version, Version(0) | Version(2))
    || to_sign.input.len() != 1
    || to_sign.input[0].previous_output != to_spend_outpoint
    || to_sign.output.len() != 1
    || to_sign.output[0].value != Amount::from_sat(0)
    || to_sign.output[0].script_pubkey != op_return
  {
    return Err(Error::ToSignInvalid);
  }

  Ok(())
}

#[allow(clippy::result_large_err)]
fn verify_full_p2wpkh(
  address: &Address,
  message: impl AsRef<[u8]>,
  to_sign: Transaction,
  pub_key: PublicKey,
  is_p2sh: bool,
) -> Result<()> {
  let to_spend = create_to_spend(address, message)?;

  check_to_sign(&to_spend, &to_sign)?;

  let witness = to_sign.input[0].witness.clone();

  if witness.is_empty() {
    return Err(Error::WitnessEmpty);
  }

  if witness.len() != 2 {
    return Err(Error::InvalidWitness);
  }

  let encoded_signature = witness.to_vec()[0].clone();
  let witness_pub_key = &witness.to_vec()[1];

  if &pub_key.to_bytes() != witness_pub_key {
    return Err(Error::PublicKeyMismatch);
  }

  let p2wpkh_script = ScriptBuf::new_p2wpkh(
    &pub_key
      .wpubkey_hash()
      .context(error::UncompressedPublicKey)?,
  );

  let expected_script_pubkey = if is_p2sh {
    ScriptBuf::new_p2sh(&p2wpkh_script.script_hash())
  } else {
    p2wpkh_script.clone()
  };

  if address.script_pubkey() != expected_script_pubkey {
    return Err(Error::PublicKeyMismatch);
  }

  if !is_p2sh && !to_sign.input[0].script_sig.is_empty() {
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

  if !(sighash_type == EcdsaSighashType::All) {
    return Err(Error::SigHashTypeUnsupported {
      sighash_type: sighash_type.to_string(),
    });
  }

  let mut sighash_cache = SighashCache::new(to_sign);

  let sighash = sighash_cache
    .p2wpkh_signature_hash(0, &p2wpkh_script, to_spend.output[0].value, sighash_type)
    .expect("signature hash should compute");

  let message =
    Message::from_digest_slice(sighash.as_ref()).expect("should be cryptographically secure hash");

  Secp256k1::verification_only()
    .verify_ecdsa(&message, &signature, &pub_key.inner)
    .context(error::SignatureInvalid)?;

  Ok(())
}

#[allow(clippy::result_large_err)]
fn verify_full_p2tr(
  address: &Address,
  message: impl AsRef<[u8]>,
  to_sign: Transaction,
  pub_key: XOnlyPublicKey,
) -> Result<()> {
  let to_spend = create_to_spend(address, message)?;

  check_to_sign(&to_spend, &to_sign)?;

  if !to_sign.input[0].script_sig.is_empty() {
    return Err(Error::ToSignInvalid);
  }

  let witness = to_sign.input[0].witness.clone();

  if witness.is_empty() {
    return Err(Error::WitnessEmpty);
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
    .taproot_key_spend_signature_hash(
      0,
      &sighash::Prevouts::All(&[TxOut {
        value: Amount::from_sat(0),
        script_pubkey: to_spend.output[0].clone().script_pubkey,
      }]),
      sighash_type,
    )
    .expect("signature hash should compute");

  let message =
    Message::from_digest_slice(sighash.as_ref()).expect("should be cryptographically secure hash");

  Secp256k1::verification_only()
    .verify_schnorr(&signature, &message, &pub_key)
    .context(error::SignatureInvalid)
}

/// Verify a BIP-322 proof for a P2WSH
#[allow(clippy::result_large_err)]
fn verify_full_p2wsh(
  address: &Address,
  message: impl AsRef<[u8]>,
  to_sign: Transaction,
) -> Result<()> {
  let to_spend = create_to_spend(address, message)?;

  check_to_sign(&to_spend, &to_sign)?;

  let items = to_sign.input[0].witness.to_vec();

  if items.len() < 3 {
    return Err(Error::InvalidWitness);
  }

  if !items[0].is_empty() {
    return Err(Error::InvalidWitness);
  }

  let witness_script = ScriptBuf::from_bytes(items[items.len() - 1].clone());

  let program = ScriptBuf::new_p2wsh(&witness_script.wscript_hash());
  let spk = address.script_pubkey();

  let expected_script_sig = if spk == ScriptBuf::new_p2sh(&program.script_hash()) {
    push_only_script(&program)
  } else if spk == program {
    ScriptBuf::new()
  } else {
    return Err(Error::ToSignInvalid);
  };

  if to_sign.input[0].script_sig != expected_script_sig {
    return Err(Error::ToSignInvalid);
  }

  let (required, pubkeys) = parse_multisig(&witness_script)?;

  let signatures = &items[1..items.len() - 1];
  if signatures.len() != required {
    return Err(Error::InvalidWitness);
  }

  let sighash = SighashCache::new(&to_sign)
    .p2wsh_signature_hash(
      0,
      &witness_script,
      to_spend.output[0].value,
      EcdsaSighashType::All,
    )
    .expect("signature hash should compute");

  let message =
    Message::from_digest_slice(sighash.as_ref()).expect("should be cryptographically secure hash");

  let secp = Secp256k1::verification_only();

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
      if secp
        .verify_ecdsa(&message, &signature, &pub_key.inner)
        .is_ok()
      {
        sig_index += 1;
      }
    }
  }

  if sig_index == signatures.len() {
    Ok(())
  } else {
    Err(Error::SignatureInvalid {
      source: bitcoin::secp256k1::Error::IncorrectSignature,
    })
  }
}

/// Verify a BIP-322 proof for a P2SH multisig address
#[allow(clippy::result_large_err)]
fn verify_full_p2sh_multisig(
  address: &Address,
  message: impl AsRef<[u8]>,
  to_sign: Transaction,
) -> Result<()> {
  let to_spend = create_to_spend(address, message)?;

  check_to_sign(&to_spend, &to_sign)?;

  let mut pushes: Vec<Vec<u8>> = Vec::new();
  for instruction in to_sign.input[0].script_sig.instructions() {
    match instruction.map_err(|_| Error::InvalidWitness)? {
      Instruction::PushBytes(b) => pushes.push(b.as_bytes().to_vec()),
      _ => return Err(Error::InvalidWitness),
    }
  }

  let Some((redeem_bytes, sig_pushes)) = pushes.split_last() else {
    return Err(Error::InvalidWitness);
  };
  let redeem_script = ScriptBuf::from_bytes(redeem_bytes.clone());

  if address.script_pubkey() != ScriptBuf::new_p2sh(&redeem_script.script_hash()) {
    return Err(Error::ToSignInvalid);
  }

  let (required_signatures, pubkeys) = parse_multisig(&redeem_script)?;

  let Some((null_dummy, signatures)) = sig_pushes.split_first() else {
    return Err(Error::InvalidWitness);
  };

  if !null_dummy.is_empty()
    || signatures.iter().any(|signature| signature.is_empty())
    || signatures.len() != required_signatures
  {
    return Err(Error::InvalidWitness);
  }

  let sighash = SighashCache::new(&to_sign)
    .legacy_signature_hash(0, &redeem_script, EcdsaSighashType::All.to_u32())
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

    let offset = pubkeys[key_index..]
      .iter()
      .position(|pk| secp.verify_ecdsa(&message, &signature, &pk.inner).is_ok())
      .ok_or(Error::SignatureInvalid {
        source: bitcoin::secp256k1::Error::IncorrectSignature,
      })?;
    key_index += offset + 1;
  }

  Ok(())
}

/// Verify a BIP-322 proof for a P2PKH
#[allow(clippy::result_large_err)]
fn verify_full_p2pkh(
  address: &Address,
  message: impl AsRef<[u8]>,
  to_sign: Transaction,
) -> Result<()> {
  let to_spend = create_to_spend(address, message)?;

  check_to_sign(&to_spend, &to_sign)?;

  if !to_sign.input[0].witness.is_empty() {
    return Err(Error::InvalidWitness);
  }

  let mut instructions = to_sign.input[0].script_sig.instructions();
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

  if address.script_pubkey() != ScriptBuf::new_p2pkh(&pub_key.pubkey_hash()) {
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

  let sighash = SighashCache::new(&to_sign)
    .legacy_signature_hash(
      0,
      &to_spend.output[0].script_pubkey,
      EcdsaSighashType::All.to_u32(),
    )
    .expect("signature hash should compute");
  let msg =
    Message::from_digest_slice(sighash.as_ref()).expect("should be cryptographically secure hash");

  Secp256k1::verification_only()
    .verify_ecdsa(&msg, &signature, &pub_key.inner)
    .context(error::SignatureInvalid)
}
