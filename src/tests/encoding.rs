use super::fixtures::*;
use super::*;
use crate::verify::preflight::{self, PsbtShape};

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
    Verification::Invalid(Error::InvalidWitness)
  ));
}

#[test]
fn full_and_psbt_preflights_bound_witness_counts() {
  let (_, valid_tx) = full_p2wpkh_to_sign();
  let mut valid_tx_bytes = Vec::new();
  valid_tx.consensus_encode(&mut valid_tx_bytes).unwrap();
  assert!(preflight::transaction(&valid_tx_bytes));

  let mut bad_tx = Vec::new();
  bad_tx.extend_from_slice(&0i32.to_le_bytes());
  bad_tx.extend_from_slice(&[0, 1]);
  bad_tx.push(1);
  bad_tx.extend_from_slice(&[0; 36]);
  bad_tx.push(0);
  bad_tx.extend_from_slice(&[0; 4]);
  bad_tx.push(0);
  bad_tx.extend_from_slice(&[0xfe, 0x00, 0x09, 0x3d, 0x00]);
  assert!(!preflight::transaction(&bad_tx));
  let encoded = format!(
    "{}{}",
    FULL_SIGNATURE_PREFIX,
    general_purpose::STANDARD.encode(&bad_tx)
  );
  assert!(matches!(
    verify_full_encoded(SEGWIT_ADDRESS, "foo", &encoded),
    Verification::Invalid(Error::ToSignInvalid)
  ));

  let (_, psbt) = pof_with_p2wpkh_challenge(&[pof_p2tr_proof_input()]);
  let valid_psbt = psbt.serialize();
  assert!(preflight::psbt(&valid_psbt).is_some());

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
  assert!(preflight::psbt(&bad_psbt).is_none());
  let encoded = format!(
    "{}{}",
    POF_SIGNATURE_PREFIX,
    general_purpose::STANDARD.encode(&bad_psbt)
  );
  assert!(matches!(
    verify_pof_encoded(SEGWIT_ADDRESS, POF_P2TR_MESSAGE, &encoded),
    Verification::Invalid(Error::ToSignInvalid)
  ));

  let mut bad_global_tx = b"psbt\xff".to_vec();
  bad_global_tx.push(1);
  bad_global_tx.push(0x00);
  bitcoin::consensus::encode::VarInt(bad_tx.len() as u64)
    .consensus_encode(&mut bad_global_tx)
    .unwrap();
  bad_global_tx.extend_from_slice(&bad_tx);
  bad_global_tx.push(0);
  assert!(preflight::psbt(&bad_global_tx).is_none());

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
  assert!(preflight::psbt(&bad_non_witness_utxo).is_none());
}

#[test]
fn witness_preflight_checks_boundaries() {
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
  assert!(preflight::witness(&encoded));

  encoded.push(0);
  assert!(preflight::witness(&encoded));

  for bytes in [
    vec![0xfd, 0, 0],    // non-minimal item count
    vec![1, 0xfd, 0, 0], // non-minimal item length
    vec![2, 0],          // impossible item count
    vec![1, 2, 0],       // impossible item length
  ] {
    assert!(!preflight::witness(&bytes), "accepted {bytes:?}");
  }
}

#[test]
fn encoded_verifiers_reject_payloads_over_the_weight_limit() {
  // Pads the decoded payload of a valid proof with zeros up to `length`.
  fn padded(encoded: &str, length: usize) -> String {
    let (prefix, payload) = encoded.split_at(3);
    let mut bytes = general_purpose::STANDARD.decode(payload).unwrap();
    bytes.resize(length, 0);
    format!("{prefix}{}", general_purpose::STANDARD.encode(bytes))
  }

  // At the limit, the padding is decoded and found to trail the proof; past
  // it, the payload is rejected before decoding.
  let simple =
    crate::sign::sign_simple_encoded(SEGWIT_ADDRESS, "Hello World", &[WIF_PRIVATE_KEY], None)
      .unwrap();
  assert!(matches!(
    verify_simple_encoded(SEGWIT_ADDRESS, "Hello World", &padded(&simple, 4_000_000)),
    Verification::Invalid(Error::TrailingBytes)
  ));
  assert!(matches!(
    verify_simple_encoded(SEGWIT_ADDRESS, "Hello World", &padded(&simple, 4_000_001)),
    Verification::Invalid(Error::ToSignInvalid)
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
    verify_full_encoded(SEGWIT_ADDRESS, "Hello World", &padded(&full, 4_000_000)),
    Verification::Invalid(Error::TrailingBytes)
  ));
  assert!(matches!(
    verify_full_encoded(SEGWIT_ADDRESS, "Hello World", &padded(&full, 4_000_001)),
    Verification::Invalid(Error::ToSignInvalid)
  ));
}

#[test]
fn psbt_preflight_reads_zero_input_transactions_like_rust_bitcoin() {
  for outputs in [1, 2] {
    let unsigned = Transaction {
      version: Version(2),
      lock_time: LockTime::ZERO,
      input: Vec::new(),
      output: vec![
        TxOut {
          value: Amount::ZERO,
          script_pubkey: ScriptBuf::new(),
        };
        outputs
      ],
    };
    let bytes = Psbt::from_unsigned_tx(unsigned).unwrap().serialize();

    let decoded = Psbt::deserialize(&bytes).unwrap();
    assert_eq!((decoded.inputs.len(), decoded.outputs.len()), (0, outputs));
    assert_eq!(
      preflight::psbt(&bytes),
      Some(PsbtShape { inputs: 0, outputs })
    );

    let encoded = format!(
      "{POF_SIGNATURE_PREFIX}{}",
      general_purpose::STANDARD.encode(&bytes)
    );
    assert!(matches!(
      verify_pof_encoded(SEGWIT_ADDRESS, "foo", &encoded),
      Verification::Invalid(Error::ToSignInvalid)
    ));
  }
}

#[test]
fn preflights_accept_every_mutation_rust_bitcoin_decodes() {
  // Every truncation, every single-bit flip, and every CompactSize prefix
  // byte at every position.
  fn mutations(bytes: &[u8]) -> Vec<Vec<u8>> {
    let mut mutations: Vec<Vec<u8>> = (0..bytes.len()).map(|len| bytes[..len].to_vec()).collect();
    for position in 0..bytes.len() {
      let replacements = (0..8)
        .map(|bit| bytes[position] ^ (1 << bit))
        .chain([0x00, 0xfd, 0xfe, 0xff]);
      for replacement in replacements {
        let mut mutated = bytes.to_vec();
        mutated[position] = replacement;
        mutations.push(mutated);
      }
    }
    mutations
  }

  // A proof of funds carrying a witness and, for its legacy input, a
  // previous transaction in the witness serialization.
  let legacy_key = PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap();
  let prev_tx = Transaction {
    version: Version(2),
    lock_time: LockTime::ZERO,
    input: vec![TxIn {
      witness: Witness::from_slice(&[vec![1, 2, 3]]),
      ..TxIn::default()
    }],
    output: vec![TxOut {
      value: Amount::from_sat(345678),
      script_pubkey: ScriptBuf::new_p2pkh(&legacy_key.public_key(&Secp256k1::new()).pubkey_hash()),
    }],
  };
  let legacy_input = ProofInput {
    outpoint: OutPoint {
      txid: prev_tx.compute_txid(),
      vout: 0,
    },
    prevout: prev_tx.output[0].clone(),
    prev_tx: Some(prev_tx),
    private_keys: vec![legacy_key],
    witness_script: None,
  };
  let (_, psbt) = pof_with_p2wpkh_challenge(&[pof_p2tr_proof_input(), legacy_input]);

  let mut decoded_psbts = 0;
  for mutated in mutations(&psbt.serialize()) {
    let shape = preflight::psbt(&mutated);
    if let Ok(decoded) = Psbt::deserialize(&mutated) {
      decoded_psbts += 1;
      assert_eq!(
        shape,
        Some(PsbtShape {
          inputs: decoded.inputs.len(),
          outputs: decoded.outputs.len(),
        }),
        "{}",
        hex::encode(&mutated)
      );
    }
  }
  assert!(decoded_psbts > 0);

  let (_, to_sign) = full_p2wpkh_to_sign();
  let mut decoded_transactions = 0;
  for mutated in mutations(&bitcoin::consensus::serialize(&to_sign)) {
    let accepted = preflight::transaction(&mutated);
    if bitcoin::consensus::deserialize::<Transaction>(&mutated).is_ok() {
      decoded_transactions += 1;
      assert!(accepted, "{}", hex::encode(&mutated));
    }
  }
  assert!(decoded_transactions > 0);

  let address = Address::from_str(P2WSH_2OF2_ADDRESS)
    .unwrap()
    .assume_checked();
  let mut decoded_witnesses = 0;
  for mutated in mutations(&bitcoin::consensus::serialize(&p2wsh_2of2_witness(
    &address,
  ))) {
    let accepted = preflight::witness(&mutated);
    if bitcoin::consensus::deserialize::<Witness>(&mutated).is_ok() {
      decoded_witnesses += 1;
      assert!(accepted, "{}", hex::encode(&mutated));
    }
  }
  assert!(decoded_witnesses > 0);
}
