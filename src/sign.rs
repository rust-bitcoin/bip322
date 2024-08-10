use super::*;

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

pub fn simple_sign(address: &Address, message: &str, wallet: &Wallet) -> String {
  let to_spend = create_to_spend(address, message.as_bytes());
  let to_sign = create_to_sign(&to_spend, None);

  let witness = create_message_signature(&to_spend, &to_sign, wallet.private_key);

  let mut buffer = Vec::new();
  witness.consensus_encode(&mut buffer).unwrap();

  general_purpose::STANDARD.encode(buffer)
}

pub fn full_sign(address: &Address, message: &str, wallet: &Wallet) -> String {
  let to_spend = create_to_spend(address, message.as_bytes());
  let mut to_sign = create_to_sign(&to_spend, None);

  let witness = create_message_signature(&to_spend, &to_sign, wallet.private_key);
  to_sign.inputs[0].final_script_witness = Some(witness);

  let mut buffer = Vec::new();
  to_sign
    .extract_tx()
    .unwrap()
    .consensus_encode(&mut buffer)
    .unwrap();

  general_purpose::STANDARD.encode(buffer)
}
