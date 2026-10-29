use super::fixtures::*;
use super::*;

#[test]
fn encoded_decode_failure_and_validation_failure_are_both_invalid() {
  // malformed encoding: a decode failure
  assert!(matches!(
    crate::verify::verify_simple_encoded(SEGWIT_ADDRESS, "Hello World", "not base64!!!"),
    Verification::Invalid(Error::SignatureDecode { .. })
  ));

  // well-formed encoding, wrong message: a validation failure
  let signature =
    crate::sign::sign_simple_encoded(SEGWIT_ADDRESS, "Hello World", &[WIF_PRIVATE_KEY], None)
      .unwrap();
  assert!(matches!(
    crate::verify::verify_simple_encoded(SEGWIT_ADDRESS, "wrong message", &signature),
    Verification::Invalid(Error::SignatureInvalid { .. })
  ));
}

#[test]
fn encoded_verifiers_reject_trailing_bytes() {
  // Appends a garbage byte after the decoded value and re-encodes.
  fn with_trailing_byte(encoded: &str) -> String {
    let (prefix, payload) = encoded.split_at(3);
    let mut bytes = general_purpose::STANDARD.decode(payload).unwrap();
    bytes.push(0);
    format!("{prefix}{}", general_purpose::STANDARD.encode(bytes))
  }

  let simple =
    crate::sign::sign_simple_encoded(SEGWIT_ADDRESS, "Hello World", &[WIF_PRIVATE_KEY], None)
      .unwrap();

  assert!(matches!(
    crate::verify::verify_simple_encoded(
      SEGWIT_ADDRESS,
      "Hello World",
      &with_trailing_byte(&simple)
    ),
    Verification::Invalid(Error::TrailingBytes)
  ));

  let full = crate::sign::sign_full_encoded(
    SEGWIT_ADDRESS,
    "Hello World",
    &[WIF_PRIVATE_KEY],
    None,
    LockParams::default(),
  )
  .unwrap();

  assert!(matches!(
    crate::verify::verify_full_encoded(SEGWIT_ADDRESS, "Hello World", &with_trailing_byte(&full)),
    Verification::Invalid(Error::TrailingBytes)
  ));

  let pof = crate::sign::sign_pof_encoded(
    POF_P2TR_ADDRESS,
    POF_P2TR_MESSAGE,
    &[POF_P2TR_CHALLENGE_KEY],
    None,
    &[pof_p2tr_proof_input()],
    LockParams::default(),
  )
  .unwrap();

  assert!(matches!(
    verify_pof_encoded(
      POF_P2TR_ADDRESS,
      POF_P2TR_MESSAGE,
      &with_trailing_byte(&pof)
    ),
    Verification::Invalid(Error::TrailingBytes)
  ));
}

#[test]
fn encoded_witness_rejects_impossible_counts_without_allocation() {
  assert!(matches!(
    verify_simple_encoded(SEGWIT_ADDRESS, "", "/gAJPQA="),
    Verification::Invalid(_)
  ));
}

#[test]
fn full_and_psbt_preflights_bound_witness_counts() {
  let (_, valid_tx) = full_p2wpkh_to_sign();
  let mut valid_tx_bytes = Vec::new();
  valid_tx.consensus_encode(&mut valid_tx_bytes).unwrap();
  assert!(crate::valid_transaction_encoding(&valid_tx_bytes));

  let mut bad_tx = Vec::new();
  bad_tx.extend_from_slice(&0i32.to_le_bytes());
  bad_tx.extend_from_slice(&[0, 1]);
  bad_tx.push(1);
  bad_tx.extend_from_slice(&[0; 36]);
  bad_tx.push(0);
  bad_tx.extend_from_slice(&[0; 4]);
  bad_tx.push(0);
  bad_tx.extend_from_slice(&[0xfe, 0x00, 0x09, 0x3d, 0x00]);
  assert!(!crate::valid_transaction_encoding(&bad_tx));
  let encoded = format!(
    "{}{}",
    FULL_SIGNATURE_PREFIX,
    general_purpose::STANDARD.encode(&bad_tx)
  );
  assert!(verify_full_encoded(SEGWIT_ADDRESS, "foo", &encoded).is_invalid());

  let (_, psbt) = pof_with_p2wpkh_challenge(&[pof_p2tr_proof_input()]);
  let valid_psbt = psbt.serialize();
  assert!(crate::valid_psbt_encoding(&valid_psbt));

  let unsigned = Transaction {
    version: Version(0),
    lock_time: LockTime::ZERO,
    input: vec![TxIn::default()],
    output: vec![TxOut {
      value: Amount::ZERO,
      script_pubkey: ScriptBuf::new(),
    }],
  };
  let mut unsigned_bytes = Vec::new();
  unsigned.consensus_encode(&mut unsigned_bytes).unwrap();

  let mut bad_psbt = b"psbt\xff".to_vec();
  bad_psbt.push(1);
  bad_psbt.push(0x00);
  bitcoin::consensus::encode::VarInt(unsigned_bytes.len() as u64)
    .consensus_encode(&mut bad_psbt)
    .unwrap();
  bad_psbt.extend_from_slice(&unsigned_bytes);
  bad_psbt.push(0);
  bad_psbt.push(1);
  bad_psbt.push(0x08);
  let bad_witness = [0xfe, 0x00, 0x09, 0x3d, 0x00];
  bitcoin::consensus::encode::VarInt(bad_witness.len() as u64)
    .consensus_encode(&mut bad_psbt)
    .unwrap();
  bad_psbt.extend_from_slice(&bad_witness);
  bad_psbt.push(0);
  bad_psbt.push(0);
  assert!(!crate::valid_psbt_encoding(&bad_psbt));
  let encoded = format!(
    "{}{}",
    POF_SIGNATURE_PREFIX,
    general_purpose::STANDARD.encode(&bad_psbt)
  );
  assert!(verify_pof_encoded(SEGWIT_ADDRESS, POF_P2TR_MESSAGE, &encoded).is_invalid());

  let mut bad_global_tx = b"psbt\xff".to_vec();
  bad_global_tx.push(1);
  bad_global_tx.push(0x00);
  bitcoin::consensus::encode::VarInt(bad_tx.len() as u64)
    .consensus_encode(&mut bad_global_tx)
    .unwrap();
  bad_global_tx.extend_from_slice(&bad_tx);
  bad_global_tx.push(0);
  assert!(!crate::valid_psbt_encoding(&bad_global_tx));

  let mut bad_non_witness_utxo = b"psbt\xff".to_vec();
  bad_non_witness_utxo.push(1);
  bad_non_witness_utxo.push(0x00);
  bitcoin::consensus::encode::VarInt(unsigned_bytes.len() as u64)
    .consensus_encode(&mut bad_non_witness_utxo)
    .unwrap();
  bad_non_witness_utxo.extend_from_slice(&unsigned_bytes);
  bad_non_witness_utxo.push(0);
  bad_non_witness_utxo.push(1);
  bad_non_witness_utxo.push(0x00);
  bitcoin::consensus::encode::VarInt(bad_tx.len() as u64)
    .consensus_encode(&mut bad_non_witness_utxo)
    .unwrap();
  bad_non_witness_utxo.extend_from_slice(&bad_tx);
  bad_non_witness_utxo.push(0);
  bad_non_witness_utxo.push(0);
  assert!(!crate::valid_psbt_encoding(&bad_non_witness_utxo));
}

#[test]
fn valid_witness_encoding_checks_boundaries() {
  let address = Address::from_str(SEGWIT_ADDRESS).unwrap().assume_checked();
  let witness = crate::sign::sign_simple(
    &address,
    "foo",
    &[PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap()],
    None,
  )
  .unwrap();
  let mut encoded = Vec::new();
  witness.consensus_encode(&mut encoded).unwrap();
  assert!(crate::valid_witness_encoding(&encoded));

  encoded.push(0);
  assert!(crate::valid_witness_encoding(&encoded));

  for bytes in [
    vec![0xfd, 0, 0],    // non-minimal item count
    vec![1, 0xfd, 0, 0], // non-minimal item length
    vec![2, 0],          // impossible item count
    vec![1, 2, 0],       // impossible item length
  ] {
    assert!(!crate::valid_witness_encoding(&bytes), "accepted {bytes:?}");
  }
}
