use super::*;

/// Signs a message in the BIP-137 legacy format from string inputs.
#[allow(clippy::result_large_err)]
pub fn sign_legacy_encoded(address: &str, message: &str, wif_private_key: &str) -> Result<String> {
  let address = Address::from_str(address)
    .context(error::AddressParse { address })?
    .assume_checked();
  let private_key = PrivateKey::from_wif(wif_private_key).context(error::PrivateKeyParse)?;

  Ok(general_purpose::STANDARD.encode(sign_legacy(&address, message, &private_key)?.serialize()))
}

/// Signs a message in the BIP-137 legacy format from proper Rust types.
#[allow(clippy::result_large_err)]
pub fn sign_legacy(
  address: &Address,
  message: &str,
  private_key: &PrivateKey,
) -> Result<MessageSignature> {
  let secp = Secp256k1::new();
  let pubkey = private_key.public_key(&secp);

  if address.script_pubkey() != ScriptBuf::new_p2pkh(&pubkey.pubkey_hash()) {
    return Err(Error::UnsupportedAddress {
      address: address.to_string(),
    });
  }

  let msg = Message::from_digest(signed_msg_hash(message).to_byte_array());

  let recoverable = secp.sign_ecdsa_recoverable(&msg, &private_key.inner);

  Ok(MessageSignature::new(recoverable, pubkey.compressed))
}

/// Signs the BIP-322 simple from spec-compliant string encodings.
#[allow(clippy::result_large_err)]
pub fn sign_simple_encoded(
  address: &str,
  message: &str,
  wif_private_keys: &[impl AsRef<str>],
  witness_script_hex: Option<&str>,
) -> Result<String> {
  let address = Address::from_str(address)
    .context(error::AddressParse { address })?
    .assume_checked();

  let private_keys: Vec<PrivateKey> = wif_private_keys
    .iter()
    .map(|private_key| PrivateKey::from_wif(private_key.as_ref()).context(error::PrivateKeyParse))
    .collect::<Result<Vec<_>>>()?;

  let witness_script = witness_script_hex
    .map(|hex| ScriptBuf::from_hex(hex).context(error::WitnessScriptParse))
    .transpose()?;

  let witness = sign_simple(&address, message, &private_keys, witness_script.as_ref())?;

  let mut buffer = Vec::new();

  witness
    .consensus_encode(&mut buffer)
    .context(error::WitnessEncoding)?;

  Ok(general_purpose::STANDARD.encode(buffer))
}

/// Signs the BIP-322 full from spec-compliant string encodings.
#[allow(clippy::result_large_err)]
pub fn sign_full_encoded(
  address: &str,
  message: &str,
  wif_private_keys: &[impl AsRef<str>],
  witness_script_hex: Option<&str>,
) -> Result<String> {
  let address = Address::from_str(address)
    .context(error::AddressParse { address })?
    .assume_checked();

  let private_keys: Vec<PrivateKey> = wif_private_keys
    .iter()
    .map(|private_key| PrivateKey::from_wif(private_key.as_ref()).context(error::PrivateKeyParse))
    .collect::<Result<Vec<_>>>()?;

  let witness_script = witness_script_hex
    .map(|hex| ScriptBuf::from_hex(hex).context(error::WitnessScriptParse))
    .transpose()?;

  let tx = sign_full(&address, message, &private_keys, witness_script.as_ref())?;

  let mut buffer = Vec::new();

  tx.consensus_encode(&mut buffer)
    .context(error::TransactionEncode)?;

  Ok(general_purpose::STANDARD.encode(buffer))
}

/// Signs in the BIP-322 simple format from proper Rust types and returns the witness.
#[allow(clippy::result_large_err)]
pub fn sign_simple(
  address: &Address,
  message: impl AsRef<[u8]>,
  private_keys: &[PrivateKey],
  witness_script: Option<&ScriptBuf>,
) -> Result<Witness> {
  if matches!(address.to_address_data(), AddressData::P2sh { .. }) && witness_script.is_some() {
    return Err(Error::UnsupportedAddress {
      address: address.to_string(),
    });
  }

  let tx = sign_full(address, message, private_keys, witness_script)?;

  if tx.input[0].witness.is_empty() {
    return Err(Error::UnsupportedAddress {
      address: address.to_string(),
    });
  }

  Ok(tx.input[0].witness.clone())
}

/// Signs in the BIP-322 full format from proper Rust types and returns the full transaction.
#[allow(clippy::result_large_err)]
pub fn sign_full(
  address: &Address,
  message: impl AsRef<[u8]>,
  private_keys: &[PrivateKey],
  witness_script: Option<&ScriptBuf>,
) -> Result<Transaction> {
  let to_spend = create_to_spend(address, message)?;
  let mut to_sign = create_to_sign(&to_spend, None)?;

  if private_keys.is_empty() {
    return Err(Error::NoPrivateKeys);
  }

  let witness = match address.to_address_data() {
    AddressData::Segwit { witness_program } => {
      let version = witness_program.version().to_num();
      let program_len = witness_program.program().len();

      match version {
        0 => match program_len {
          20 => {
            create_message_signature_p2wpkh(&to_spend, &to_sign, single_key(private_keys)?, false)
          }
          32 => {
            let witness_script = witness_script.ok_or(Error::InvalidWitness)?;

            if address.script_pubkey() != ScriptBuf::new_p2wsh(&witness_script.wscript_hash()) {
              return Err(Error::UnsupportedAddress {
                address: address.to_string(),
              });
            }

            create_message_signature_p2wsh(&to_spend, &to_sign, private_keys, witness_script)?
          }
          _ => return Err(Error::NotKeyPathSpend),
        },
        1 => {
          if program_len != 32 {
            return Err(Error::NotKeyPathSpend);
          }
          create_message_signature_taproot(&to_spend, &to_sign, single_key(private_keys)?, None)
        }
        _ => {
          return Err(Error::UnsupportedAddress {
            address: address.to_string(),
          })
        }
      }
    }
    AddressData::P2sh { script_hash: _ } => match witness_script {
      Some(ws) => {
        let p2wsh_redeem = ScriptBuf::new_p2wsh(&ws.wscript_hash());

        if address.script_pubkey() == ScriptBuf::new_p2sh(&ws.script_hash()) {
          create_message_signature_p2sh_multisig(&mut to_sign, private_keys, ws)?
        } else if address.script_pubkey() == ScriptBuf::new_p2sh(&p2wsh_redeem.script_hash()) {
          let witness = create_message_signature_p2wsh(&to_spend, &to_sign, private_keys, ws)?;

          to_sign.inputs[0].final_script_sig = Some(push_only_script(&p2wsh_redeem));

          witness
        } else {
          return Err(Error::UnsupportedAddress {
            address: address.to_string(),
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
        if address.script_pubkey() != ScriptBuf::new_p2sh(&redeem.script_hash()) {
          return Err(Error::UnsupportedAddress {
            address: address.to_string(),
          });
        }

        let witness = create_message_signature_p2wpkh(&to_spend, &to_sign, private_key, true);

        to_sign.inputs[0].final_script_sig = Some(push_only_script(&redeem));

        witness
      }
    },
    AddressData::P2pkh { pubkey_hash: _ } => {
      create_message_signature_p2pkh(&to_spend, &mut to_sign, single_key(private_keys)?)?
    }
    _ => {
      return Err(Error::UnsupportedAddress {
        address: address.to_string(),
      });
    }
  };

  if !witness.is_empty() {
    to_sign.inputs[0].final_script_witness = Some(witness);
  }
  to_sign.extract_tx().context(error::TransactionExtract)
}

/// Sign for segwit inputs
pub fn create_message_signature_p2wpkh(
  to_spend_tx: &Transaction,
  to_sign: &Psbt,
  private_key: &PrivateKey,
  is_p2sh: bool,
) -> Witness {
  let secp = Secp256k1::new();
  let sighash_type = EcdsaSighashType::All;
  let mut sighash_cache = SighashCache::new(to_sign.unsigned_tx.clone());

  let pub_key = private_key.public_key(&secp);

  let sighash = sighash_cache
    .p2wpkh_signature_hash(
      0,
      &if is_p2sh {
        ScriptBuf::new_p2wpkh(&pub_key.wpubkey_hash().unwrap())
      } else {
        to_spend_tx.output[0].script_pubkey.clone()
      },
      to_spend_tx.output[0].value,
      sighash_type,
    )
    .expect("signature hash should compute");

  let signature = secp.sign_ecdsa(
    &secp256k1::Message::from_digest_slice(sighash.as_ref())
      .expect("should be cryptographically secure hash"),
    &private_key.inner,
  );

  let witness = sighash_cache
    .witness_mut(0)
    .expect("getting mutable witness reference should work");

  witness.push(
    bitcoin::ecdsa::Signature {
      signature,
      sighash_type,
    }
    .to_vec(),
  );

  witness.push(pub_key.to_bytes());

  witness.to_owned()
}

/// Sign for taproot inputs
pub fn create_message_signature_taproot(
  to_spend_tx: &Transaction,
  to_sign: &Psbt,
  private_key: &PrivateKey,
  aux_rand: Option<[u8; 32]>,
) -> Witness {
  let mut to_sign = to_sign.clone();

  let secp = Secp256k1::new();
  let key_pair = Keypair::from_secret_key(&secp, &private_key.inner);

  let (x_only_public_key, _parity) = XOnlyPublicKey::from_keypair(&key_pair);
  to_sign.inputs[0].tap_internal_key = Some(x_only_public_key);

  let sighash_type = TapSighashType::All;

  let mut sighash_cache = SighashCache::new(to_sign.unsigned_tx.clone());

  let sighash = sighash_cache
    .taproot_key_spend_signature_hash(
      0,
      &sighash::Prevouts::All(&[TxOut {
        value: Amount::from_sat(0),
        script_pubkey: to_spend_tx.output[0].clone().script_pubkey,
      }]),
      sighash_type,
    )
    .expect("signature hash should compute");

  let key_pair = key_pair
    .tap_tweak(&secp, to_sign.inputs[0].tap_merkle_root)
    .to_keypair();

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
    .witness_mut(0)
    .expect("getting mutable witness reference should work");

  witness.push(
    bitcoin::taproot::Signature {
      signature,
      sighash_type,
    }
    .to_vec(),
  );

  witness.to_owned()
}

/// Sign for multisig
#[allow(clippy::result_large_err)]
pub fn create_message_signature_p2wsh(
  to_spend_tx: &Transaction,
  to_sign: &Psbt,
  private_keys: &[PrivateKey],
  witness_script: &ScriptBuf,
) -> Result<Witness> {
  let secp = Secp256k1::new();
  let sighash_type = EcdsaSighashType::All;
  let mut sighash_cache = SighashCache::new(to_sign.unsigned_tx.clone());

  let sighash = sighash_cache
    .p2wsh_signature_hash(0, witness_script, to_spend_tx.output[0].value, sighash_type)
    .expect("signature hash should compute");

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
#[allow(clippy::result_large_err)]
pub fn create_message_signature_p2sh_multisig(
  to_sign: &mut Psbt,
  private_keys: &[PrivateKey],
  redeem_script: &ScriptBuf,
) -> Result<Witness> {
  let secp = Secp256k1::new();
  let sighash_type = EcdsaSighashType::All;

  let sighash = SighashCache::new(to_sign.unsigned_tx.clone())
    .legacy_signature_hash(0, redeem_script, sighash_type.to_u32())
    .expect("signature hash should compute");

  let message = secp256k1::Message::from_digest_slice(sighash.as_ref())
    .expect("should be cryptographically secure hash");

  let signatures = ordered_multisig_signatures(&secp, redeem_script, private_keys, &message)?;

  let mut builder = ScriptBuf::builder().push_opcode(opcodes::OP_0);

  for signature in signatures {
    builder = builder.push_slice(push_bytes(&signature));
  }

  to_sign.inputs[0].final_script_sig = Some(
    builder
      .push_slice(push_bytes(redeem_script.as_bytes()))
      .into_script(),
  );

  Ok(Witness::new())
}

#[allow(clippy::result_large_err)]
fn single_key(private_keys: &[PrivateKey]) -> Result<&PrivateKey> {
  if private_keys.len() != 1 {
    return Err(Error::SignatureCount {
      required: 1,
      provided: private_keys.len(),
    });
  }

  Ok(&private_keys[0])
}

/// Sign for p2pkh
#[allow(clippy::result_large_err)]
pub fn create_message_signature_p2pkh(
  to_spend_tx: &Transaction,
  to_sign: &mut Psbt,
  private_key: &PrivateKey,
) -> Result<Witness> {
  let secp = Secp256k1::new();
  let sighash_type = EcdsaSighashType::All;
  let pub_key = private_key.public_key(&secp);
  if to_spend_tx.output[0].script_pubkey != ScriptBuf::new_p2pkh(&pub_key.pubkey_hash()) {
    return Err(Error::PublicKeyMismatch);
  }

  let sighash = SighashCache::new(to_sign.unsigned_tx.clone())
    .legacy_signature_hash(
      0,
      &to_spend_tx.output[0].script_pubkey,
      sighash_type.to_u32(),
    )
    .expect("signature hash should compute");
  let msg = secp256k1::Message::from_digest_slice(sighash.as_ref())
    .expect("should be cryptographically secure hash");

  let sig_bytes = bitcoin::ecdsa::Signature {
    signature: secp.sign_ecdsa(&msg, &private_key.inner),
    sighash_type,
  }
  .to_vec();

  to_sign.inputs[0].final_script_sig = Some(
    ScriptBuf::builder()
      .push_slice(push_bytes(&sig_bytes))
      .push_slice(push_bytes(&pub_key.to_bytes()))
      .into_script(),
  );

  Ok(Witness::new())
}
