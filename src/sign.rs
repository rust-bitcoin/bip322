use super::*;

/// Extra UTXO included in a proof of funds.
#[derive(Clone, Debug)]
pub struct ProofInput {
  /// The outpoint of the UTXO being proven
  pub outpoint: OutPoint,
  /// The previous output being spent
  pub prevout: TxOut,
  /// Full previous transaction for this input's outpoint.
  pub prev_tx: Option<Transaction>,
  /// Key(s) that satisfy the input: one for single-sig, `m` for an `m`-of-`n` multisig
  pub private_keys: Vec<PrivateKey>,
  /// Witness/redeem script.
  pub witness_script: Option<ScriptBuf>,
}

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

/// Signs in the BIP-322 simple format and returns the witness.
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

/// Signs in the BIP-322 full format and returns the full transaction.
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

  let prevout = to_spend.output[0].clone();

  sign_input(&mut to_sign, &[prevout], private_keys, witness_script, 0)?;

  to_sign.extract_tx().context(error::TransactionExtract)
}

/// Signs the BIP-322 full proof of funds from string inputs.
#[allow(clippy::result_large_err)]
pub fn sign_pof_encoded(
  address: &str,
  message: &str,
  wif_private_keys: &[impl AsRef<str>],
  witness_script_hex: Option<&str>,
  inputs: &[ProofInput],
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

  let to_sign = sign_pof(
    &address,
    message,
    &private_keys,
    witness_script.as_ref(),
    inputs,
  )?;

  let mut buffer = Vec::new();
  to_sign
    .serialize_to_writer(&mut buffer)
    .context(error::TransactionEncode)?;

  Ok(general_purpose::STANDARD.encode(buffer))
}

/// Signs a BIP-322 full proof
#[allow(clippy::result_large_err)]
pub fn sign_pof(
  address: &Address,
  message: impl AsRef<[u8]>,
  private_keys: &[PrivateKey],
  witness_script: Option<&ScriptBuf>,
  inputs: &[ProofInput],
) -> Result<Psbt> {
  if private_keys.is_empty() {
    return Err(Error::NoPrivateKeys);
  }

  if inputs.is_empty() {
    return Err(Error::NoProofInputs);
  }

  let to_spend = create_to_spend(address, &message)?;

  let mut to_sign = create_to_sign(&to_spend, None)?;

  for input in inputs {
    to_sign.unsigned_tx.input.push(TxIn {
      previous_output: input.outpoint,
      script_sig: ScriptBuf::new(),
      sequence: Sequence::ZERO,
      witness: Witness::new(),
    });
    to_sign.inputs.push(Default::default());
  }

  to_sign.unknown.insert(
    bitcoin::psbt::raw::Key {
      type_value: PSBT_GLOBAL_GENERIC_SIGNED_MESSAGE,
      key: vec![],
    },
    message.as_ref().to_vec(),
  );

  // create_to_sign sets a witness_utxo, but a non-segwit challenge (P2PKH or
  // bare P2SH) requires the full to_spend transaction instead.
  if !is_segwit_input(&to_spend.output[0].script_pubkey, witness_script) {
    to_sign.inputs[0].witness_utxo = None;
    to_sign.inputs[0].non_witness_utxo = Some(to_spend.clone());
  }

  let mut prevouts = Vec::with_capacity(inputs.len() + 1);
  prevouts.push(to_spend.output[0].clone());
  for input in inputs {
    prevouts.push(input.prevout.clone());
  }

  sign_input(&mut to_sign, &prevouts, private_keys, witness_script, 0)?;

  for (proof_index, input) in inputs.iter().enumerate() {
    let input_index = proof_index + 1;
    let spk = &input.prevout.script_pubkey;

    if is_segwit_input(spk, input.witness_script.as_ref()) {
      to_sign.inputs[input_index].witness_utxo = Some(input.prevout.clone());
    } else {
      let prev_tx = input
        .prev_tx
        .as_ref()
        .ok_or_else(|| Error::InvalidProofInput {
          index: proof_index,
          reason: "legacy input requires prev_tx".into(),
        })?;

      if prev_tx.compute_txid() != input.outpoint.txid {
        return Err(Error::InvalidProofInput {
          index: proof_index,
          reason: "prev_tx txid does not match outpoint".into(),
        });
      }

      let claimed = prev_tx
        .output
        .get(input.outpoint.vout as usize)
        .ok_or_else(|| Error::InvalidProofInput {
          index: proof_index,
          reason: "outpoint vout exceeds prev_tx outputs".into(),
        })?;

      if *claimed != input.prevout {
        return Err(Error::InvalidProofInput {
          index: proof_index,
          reason: "prevout does not match prev_tx output".into(),
        });
      }

      to_sign.inputs[input_index].non_witness_utxo = Some(prev_tx.clone());
    }
    sign_input(
      &mut to_sign,
      &prevouts,
      &input.private_keys,
      input.witness_script.as_ref(),
      input_index,
    )?;
  }

  Ok(to_sign)
}

/// Whether the input is spent via segwit, which decides if BIP-174 requires a
/// `witness_utxo` or a `non_witness_utxo` for it. A P2SH input is only segwit
/// if it wraps a witness program.
fn is_segwit_input(spk: &ScriptBuf, witness_script: Option<&ScriptBuf>) -> bool {
  if spk.is_p2wpkh() || spk.is_p2wsh() || spk.is_p2tr() {
    true
  } else if spk.is_p2sh() {
    match witness_script {
      Some(ws) => *spk != ScriptBuf::new_p2sh(&ws.script_hash()),
      None => true,
    }
  } else {
    false
  }
}

/// Signs input
#[allow(clippy::result_large_err)]
fn sign_input(
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
#[allow(clippy::result_large_err)]
pub fn create_message_signature_p2wpkh(
  to_sign: &Psbt,
  private_key: &PrivateKey,
  prevout: &TxOut,
  input_index: usize,
  is_p2sh: bool,
) -> Result<Witness> {
  let secp = Secp256k1::new();
  let sighash_type = EcdsaSighashType::All;
  let mut sighash_cache = SighashCache::new(to_sign.unsigned_tx.clone());

  let pub_key = private_key.public_key(&secp);

  let sighash = sighash_cache
    .p2wpkh_signature_hash(
      input_index,
      &if is_p2sh {
        ScriptBuf::new_p2wpkh(
          &pub_key
            .wpubkey_hash()
            .context(error::UncompressedPublicKey)?,
        )
      } else {
        prevout.script_pubkey.clone()
      },
      prevout.value,
      sighash_type,
    )
    .expect("signature hash should compute");

  let signature = secp.sign_ecdsa(
    &secp256k1::Message::from_digest_slice(sighash.as_ref())
      .expect("should be cryptographically secure hash"),
    &private_key.inner,
  );

  let witness = sighash_cache
    .witness_mut(input_index)
    .expect("getting mutable witness reference should work");

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
#[allow(clippy::result_large_err)]
pub fn create_message_signature_taproot(
  to_sign: &Psbt,
  private_key: &PrivateKey,
  prevouts: &[TxOut],
  input_index: usize,
  aux_rand: Option<[u8; 32]>,
) -> Result<Witness> {
  let mut to_sign = to_sign.clone();

  let secp = Secp256k1::new();
  let key_pair = Keypair::from_secret_key(&secp, &private_key.inner);

  let (x_only_public_key, _parity) = XOnlyPublicKey::from_keypair(&key_pair);
  to_sign.inputs[input_index].tap_internal_key = Some(x_only_public_key);

  let sighash_type = TapSighashType::All;

  let mut sighash_cache = SighashCache::new(to_sign.unsigned_tx.clone());

  let sighash = sighash_cache
    .taproot_key_spend_signature_hash(input_index, &sighash::Prevouts::All(prevouts), sighash_type)
    .expect("signature hash should compute");

  let key_pair = key_pair
    .tap_tweak(&secp, to_sign.inputs[input_index].tap_merkle_root)
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
    .witness_mut(input_index)
    .expect("getting mutable witness reference should work");

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
#[allow(clippy::result_large_err)]
pub fn create_message_signature_p2wsh(
  to_sign: &Psbt,
  private_keys: &[PrivateKey],
  witness_script: &ScriptBuf,
  prevout: &TxOut,
  input_index: usize,
) -> Result<Witness> {
  let secp = Secp256k1::new();
  let sighash_type = EcdsaSighashType::All;
  let mut sighash_cache = SighashCache::new(to_sign.unsigned_tx.clone());

  let sighash = sighash_cache
    .p2wsh_signature_hash(input_index, witness_script, prevout.value, sighash_type)
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
  input_index: usize,
) -> Result<Witness> {
  let secp = Secp256k1::new();
  let sighash_type = EcdsaSighashType::All;

  let sighash = SighashCache::new(to_sign.unsigned_tx.clone())
    .legacy_signature_hash(input_index, redeem_script, sighash_type.to_u32())
    .expect("signature hash should compute");

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
#[allow(clippy::result_large_err)]
pub fn create_message_signature_p2pkh(
  to_sign: &mut Psbt,
  private_key: &PrivateKey,
  prevout: &TxOut,
  input_index: usize,
) -> Result<Witness> {
  let secp = Secp256k1::new();
  let sighash_type = EcdsaSighashType::All;
  let pub_key = private_key.public_key(&secp);

  if prevout.script_pubkey != ScriptBuf::new_p2pkh(&pub_key.pubkey_hash()) {
    return Err(Error::PublicKeyMismatch);
  }

  let sighash = SighashCache::new(to_sign.unsigned_tx.clone())
    .legacy_signature_hash(input_index, &prevout.script_pubkey, sighash_type.to_u32())
    .expect("signature hash should compute");
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
