use super::*;

/// Signs the BIP-322 simple from encoded values, i.e. address encoding, message string and
/// WIF private key string. Returns a base64 encoded witness stack.
pub fn sign_simple_encoded(address: &str, message: &str, wif_private_key: &str) -> Result<String> {
  let address = Address::from_str(address)
    .context(error::AddressParse { address })?
    .assume_checked();

  let private_key = PrivateKey::from_wif(wif_private_key).context(error::PrivateKeyParse)?;

  let witness = sign_simple(&address, message.as_bytes(), private_key)?;

  let mut buffer = Vec::new();

  witness
    .consensus_encode(&mut buffer)
    .context(error::WitnessEncoding)?;

  Ok(general_purpose::STANDARD.encode(buffer))
}

/// Signs the BIP-322 full from encoded values, i.e. address encoding, message string and
/// WIF private key string. Returns a base64 encoded transaction.
pub fn sign_full_encoded(address: &str, message: &str, wif_private_key: &str) -> Result<String> {
  let address = Address::from_str(address)
    .context(error::AddressParse { address })?
    .assume_checked();

  let private_key = PrivateKey::from_wif(wif_private_key).context(error::PrivateKeyParse)?;

  let tx = sign_full(&address, message.as_bytes(), private_key)?;

  let mut buffer = Vec::new();

  tx.consensus_encode(&mut buffer)
    .context(error::TransactionEncode)?;

  Ok(general_purpose::STANDARD.encode(buffer))
}

/// Signs in the BIP-322 simple format from proper Rust types and returns the witness.
pub fn sign_simple(address: &Address, message: &[u8], private_key: PrivateKey) -> Result<Witness> {
  Ok(
    sign_full(address, message, private_key)?.input[0]
      .witness
      .clone(),
  )
}

/// Signs in the BIP-322 full format from proper Rust types and returns the full transaction.
pub fn sign_full(
  address: &Address,
  message: &[u8],
  private_key: PrivateKey,
) -> Result<Transaction> {
  if let bitcoin::address::Payload::WitnessProgram(witness_program) = address.payload() {
    if witness_program.version().to_num() != 1 {
      return Err(Error::UnsupportedAddress {
        address: address.to_string(),
      });
    }

    if witness_program.program().len() != 32 {
      return Err(Error::NotKeyPathSpend);
    }
  } else {
    return Err(Error::UnsupportedAddress {
      address: address.to_string(),
    });
  };

  let to_spend = create_to_spend(address, message)?;
  let mut to_sign = create_to_sign(&to_spend, None)?;

  let witness = create_message_signature(&to_spend, &to_sign, private_key);
  to_sign.inputs[0].final_script_witness = Some(witness);

  to_sign.extract_tx().context(error::TransactionExtract)
}

fn create_message_signature(
  to_spend_tx: &Transaction,
  to_sign: &Psbt,
  private_key: PrivateKey,
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
    .to_inner();

  let sig = secp.sign_schnorr_no_aux_rand(
    &secp256k1::Message::from_digest_slice(sighash.as_ref())
      .expect("should be cryptographically secure hash"),
    &key_pair,
  );

  let witness = sighash_cache
    .witness_mut(0)
    .expect("getting mutable witness reference should work");

  witness.push(
    bitcoin::taproot::Signature {
      sig,
      hash_ty: sighash_type,
    }
    .to_vec(),
  );

  witness.to_owned()
}
