use super::*;

/// Signs input.
pub(super) fn sign_input(
  to_sign: &mut Psbt,
  prevouts: &[TxOut],
  private_keys: &[PrivateKey],
  witness_script: Option<&ScriptBuf>,
  input_index: usize,
) -> Result<()> {
  if private_keys.is_empty() {
    return Err(Error::NoPrivateKeys);
  }

  let spk = &prevouts[input_index].script_pubkey;

  let witness = if spk.is_p2tr() {
    create_message_signature_taproot(
      to_sign,
      single_key(private_keys)?,
      prevouts,
      input_index,
      None,
    )?
  } else if spk.is_p2wsh() {
    let ws = witness_script.ok_or(Error::InvalidWitness)?;

    if *spk != ScriptBuf::new_p2wsh(&ws.wscript_hash()) {
      return Err(Error::UnsupportedAddress {
        address: spk.to_string(),
      });
    }

    create_message_signature_p2wsh(
      to_sign,
      private_keys,
      ws,
      &prevouts[input_index],
      input_index,
    )?
  } else if spk.is_p2wpkh() {
    create_message_signature_p2wpkh(
      to_sign,
      single_key(private_keys)?,
      &prevouts[input_index],
      input_index,
      false,
    )?
  } else if spk.is_p2sh() {
    match witness_script {
      Some(ws) => {
        let p2wsh_redeem = ScriptBuf::new_p2wsh(&ws.wscript_hash());

        if *spk == ScriptBuf::new_p2sh(&ws.script_hash()) {
          create_message_signature_p2sh_multisig(to_sign, private_keys, ws, input_index)?
        } else if *spk == ScriptBuf::new_p2sh(&p2wsh_redeem.script_hash()) {
          let witness = create_message_signature_p2wsh(
            to_sign,
            private_keys,
            ws,
            &prevouts[input_index],
            input_index,
          )?;

          to_sign.inputs[input_index].final_script_sig = Some(push_only_script(&p2wsh_redeem));

          witness
        } else {
          return Err(Error::UnsupportedAddress {
            address: spk.to_string(),
          });
        }
      }
      None => {
        let secp = Secp256k1::new();

        let private_key = single_key(private_keys)?;

        let wpkh = private_key
          .public_key(&secp)
          .wpubkey_hash()
          .context(error::UncompressedPublicKey)?;

        let redeem = ScriptBuf::new_p2wpkh(&wpkh);
        if *spk != ScriptBuf::new_p2sh(&redeem.script_hash()) {
          return Err(Error::UnsupportedAddress {
            address: spk.to_string(),
          });
        }

        let witness = create_message_signature_p2wpkh(
          to_sign,
          private_key,
          &prevouts[input_index],
          input_index,
          true,
        )?;

        to_sign.inputs[input_index].final_script_sig = Some(push_only_script(&redeem));

        witness
      }
    }
  } else if spk.is_p2pkh() {
    create_message_signature_p2pkh(
      to_sign,
      single_key(private_keys)?,
      &prevouts[input_index],
      input_index,
    )?
  } else {
    return Err(Error::UnsupportedAddress {
      address: spk.to_string(),
    });
  };

  if !witness.is_empty() {
    to_sign.inputs[input_index].final_script_witness = Some(witness);
  }

  Ok(())
}

/// Sign for segwit inputs
pub fn create_message_signature_p2wpkh(
  to_sign: &Psbt,
  private_key: &PrivateKey,
  prevout: &TxOut,
  input_index: usize,
  is_p2sh: bool,
) -> Result<Witness> {
  if input_index >= to_sign.unsigned_tx.input.len() {
    return Err(Error::ToSignInvalid);
  }

  let secp = Secp256k1::new();
  let sighash_type = EcdsaSighashType::All;
  let mut sighash_cache = SighashCache::new(to_sign.unsigned_tx.clone());

  let pub_key = private_key.public_key(&secp);

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

  if prevout.script_pubkey != expected_script_pubkey {
    return Err(Error::PublicKeyMismatch);
  }

  let sighash = sighash_cache
    .p2wpkh_signature_hash(
      input_index,
      &if is_p2sh {
        p2wpkh_script
      } else {
        prevout.script_pubkey.clone()
      },
      prevout.value,
      sighash_type,
    )
    .map_err(|_| Error::ToSignInvalid)?;

  let signature = secp.sign_ecdsa(
    &secp256k1::Message::from_digest_slice(sighash.as_ref())
      .expect("should be cryptographically secure hash"),
    &private_key.inner,
  );

  let witness = sighash_cache
    .witness_mut(input_index)
    .ok_or(Error::ToSignInvalid)?;

  witness.push(
    bitcoin::ecdsa::Signature {
      signature,
      sighash_type,
    }
    .to_vec(),
  );

  witness.push(pub_key.to_bytes());

  Ok(witness.to_owned())
}

/// Sign for taproot inputs
pub fn create_message_signature_taproot(
  to_sign: &Psbt,
  private_key: &PrivateKey,
  prevouts: &[TxOut],
  input_index: usize,
  aux_rand: Option<[u8; 32]>,
) -> Result<Witness> {
  if input_index >= to_sign.inputs.len()
    || input_index >= to_sign.unsigned_tx.input.len()
    || prevouts.len() != to_sign.unsigned_tx.input.len()
  {
    return Err(Error::ToSignInvalid);
  }

  let mut to_sign = to_sign.clone();

  let secp = Secp256k1::new();
  let key_pair = Keypair::from_secret_key(&secp, &private_key.inner);

  let (x_only_public_key, _parity) = XOnlyPublicKey::from_keypair(&key_pair);
  to_sign.inputs[input_index].tap_internal_key = Some(x_only_public_key);

  let sighash_type = TapSighashType::All;

  let mut sighash_cache = SighashCache::new(to_sign.unsigned_tx.clone());

  let sighash = sighash_cache
    .taproot_key_spend_signature_hash(input_index, &sighash::Prevouts::All(prevouts), sighash_type)
    .map_err(|_| Error::ToSignInvalid)?;

  let key_pair = key_pair
    .tap_tweak(&secp, to_sign.inputs[input_index].tap_merkle_root)
    .to_keypair();

  let (output_key, _parity) = XOnlyPublicKey::from_keypair(&key_pair);
  if prevouts[input_index].script_pubkey
    != ScriptBuf::new_p2tr_tweaked(output_key.dangerous_assume_tweaked())
  {
    return Err(Error::PublicKeyMismatch);
  }

  let signature = if let Some(aux_rand) = aux_rand {
    secp.sign_schnorr_with_aux_rand(
      &secp256k1::Message::from_digest_slice(sighash.as_ref())
        .expect("should be cryptographically secure hash"),
      &key_pair,
      &aux_rand,
    )
  } else {
    secp.sign_schnorr_no_aux_rand(
      &secp256k1::Message::from_digest_slice(sighash.as_ref())
        .expect("should be cryptographically secure hash"),
      &key_pair,
    )
  };

  let witness = sighash_cache
    .witness_mut(input_index)
    .ok_or(Error::ToSignInvalid)?;

  witness.push(
    bitcoin::taproot::Signature {
      signature,
      sighash_type,
    }
    .to_vec(),
  );

  Ok(witness.to_owned())
}

/// Sign for multisig
pub fn create_message_signature_p2wsh(
  to_sign: &Psbt,
  private_keys: &[PrivateKey],
  witness_script: &ScriptBuf,
  prevout: &TxOut,
  input_index: usize,
) -> Result<Witness> {
  if input_index >= to_sign.unsigned_tx.input.len() {
    return Err(Error::ToSignInvalid);
  }

  let secp = Secp256k1::new();
  let sighash_type = EcdsaSighashType::All;
  let mut sighash_cache = SighashCache::new(to_sign.unsigned_tx.clone());

  let sighash = sighash_cache
    .p2wsh_signature_hash(input_index, witness_script, prevout.value, sighash_type)
    .map_err(|_| Error::ToSignInvalid)?;

  let message = secp256k1::Message::from_digest_slice(sighash.as_ref())
    .expect("should be cryptographically secure hash");

  let mut witness = Witness::new();
  witness.push::<&[u8]>(&[]);

  let signatures = ordered_multisig_signatures(&secp, witness_script, private_keys, &message)?;

  for signature in signatures {
    witness.push(signature)
  }

  witness.push(witness_script.as_bytes());

  Ok(witness)
}

/// Sign for p2sh multisig
pub fn create_message_signature_p2sh_multisig(
  to_sign: &mut Psbt,
  private_keys: &[PrivateKey],
  redeem_script: &ScriptBuf,
  input_index: usize,
) -> Result<Witness> {
  if redeem_script.len() > 520 {
    return Err(Error::InvalidWitness);
  }

  if input_index >= to_sign.inputs.len() || input_index >= to_sign.unsigned_tx.input.len() {
    return Err(Error::ToSignInvalid);
  }

  let secp = Secp256k1::new();
  let sighash_type = EcdsaSighashType::All;

  let sighash = SighashCache::new(to_sign.unsigned_tx.clone())
    .legacy_signature_hash(input_index, redeem_script, sighash_type.to_u32())
    .map_err(|_| Error::ToSignInvalid)?;

  let message = secp256k1::Message::from_digest_slice(sighash.as_ref())
    .expect("should be cryptographically secure hash");

  let signatures = ordered_multisig_signatures(&secp, redeem_script, private_keys, &message)?;

  // OP_0 <sig_1> .. <sig_m> <redeemScript>
  let mut builder = ScriptBuf::builder().push_opcode(opcodes::OP_0);

  for signature in signatures {
    builder = builder.push_slice(push_bytes(&signature));
  }

  to_sign.inputs[input_index].final_script_sig = Some(
    builder
      .push_slice(push_bytes(redeem_script.as_bytes()))
      .into_script(),
  );

  Ok(Witness::new())
}

/// Sign for p2pkh
pub fn create_message_signature_p2pkh(
  to_sign: &mut Psbt,
  private_key: &PrivateKey,
  prevout: &TxOut,
  input_index: usize,
) -> Result<Witness> {
  if input_index >= to_sign.inputs.len() || input_index >= to_sign.unsigned_tx.input.len() {
    return Err(Error::ToSignInvalid);
  }

  let secp = Secp256k1::new();
  let sighash_type = EcdsaSighashType::All;
  let pub_key = private_key.public_key(&secp);

  if prevout.script_pubkey != ScriptBuf::new_p2pkh(&pub_key.pubkey_hash()) {
    return Err(Error::PublicKeyMismatch);
  }

  let sighash = SighashCache::new(to_sign.unsigned_tx.clone())
    .legacy_signature_hash(input_index, &prevout.script_pubkey, sighash_type.to_u32())
    .map_err(|_| Error::ToSignInvalid)?;
  let msg = secp256k1::Message::from_digest_slice(sighash.as_ref())
    .expect("should be cryptographically secure hash");

  let sig_bytes = bitcoin::ecdsa::Signature {
    signature: secp.sign_ecdsa(&msg, &private_key.inner),
    sighash_type,
  }
  .to_vec();

  to_sign.inputs[input_index].final_script_sig = Some(
    ScriptBuf::builder()
      .push_slice(push_bytes(&sig_bytes))
      .push_slice(push_bytes(&pub_key.to_bytes()))
      .into_script(),
  );

  Ok(Witness::new())
}

fn single_key(private_keys: &[PrivateKey]) -> Result<&PrivateKey> {
  if private_keys.len() != 1 {
    return Err(Error::SignatureCount {
      required: 1,
      provided: private_keys.len(),
    });
  }

  Ok(&private_keys[0])
}
