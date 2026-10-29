use super::fixtures::*;
use super::*;
use pretty_assertions::assert_eq;

#[test]
fn simple_sign_taproot() {
  assert_eq!(
    crate::sign::sign_simple_encoded(TAPROOT_ADDRESS, "Hello World", &[WIF_PRIVATE_KEY], None).unwrap(),
    "smpAUHd69PrJQEv+oKTfZ8l+WROBHuy9HKrbFCJu7U1iK2iiEy1vMU5EfMtjc+VSHM7aU0SDbak5IUZRVno2P5mjSafAQ=="
  );
}

#[test]
fn roundtrip_taproot_simple() {
  assert_valid(crate::verify::verify_simple_encoded(
    TAPROOT_ADDRESS,
    "Hello World",
    &crate::sign::sign_simple_encoded(TAPROOT_ADDRESS, "Hello World", &[WIF_PRIVATE_KEY], None)
      .unwrap(),
  ));
}

#[test]
fn roundtrip_taproot_full() {
  assert_valid(crate::verify::verify_full_encoded(
    TAPROOT_ADDRESS,
    "Hello World",
    &crate::sign::sign_full_encoded(
      TAPROOT_ADDRESS,
      "Hello World",
      &[WIF_PRIVATE_KEY],
      None,
      LockParams::default(),
    )
    .unwrap(),
  ));
}

#[test]
fn simple_sign_p2wpkh() {
  assert_eq!(
    crate::sign::sign_simple_encoded(SEGWIT_ADDRESS, "Hello World", &[WIF_PRIVATE_KEY], None).unwrap(),
    "smpAkgwRQIhAOzyynlqt93lOKJr+wmmxIens//zPzl9tqIOua93wO6MAiBi5n5EyAcPScOjf1lAqIUIQtr3zKNeavYabHyR8eGhowEhAsfxIAMZZEKUPYWI4BruhAQjzFT8FSFSajuFwrDL1Yhy"
  );

  assert_eq!(
    crate::sign::sign_simple_encoded(SEGWIT_ADDRESS, "", &[WIF_PRIVATE_KEY], None).unwrap(),
    "smpAkgwRQIhAPkJ1Q4oYS0htvyuSFHLxRQpFAY56b70UvE7Dxazen0ZAiAtZfFz1S6T6I23MWI2lK/pcNTWncuyL8UL+oMdydVgzAEhAsfxIAMZZEKUPYWI4BruhAQjzFT8FSFSajuFwrDL1Yhy"
  );
}

#[test]
fn roundtrip_p2wpkh_simple() {
  assert_valid(crate::verify::verify_simple_encoded(
    SEGWIT_ADDRESS,
    "Hello World",
    &crate::sign::sign_simple_encoded(SEGWIT_ADDRESS, "Hello World", &[WIF_PRIVATE_KEY], None)
      .unwrap(),
  ));
}

#[test]
fn roundtrip_p2wpkh_full() {
  assert_valid(crate::verify::verify_full_encoded(
    SEGWIT_ADDRESS,
    "Hello World",
    &crate::sign::sign_full_encoded(
      SEGWIT_ADDRESS,
      "Hello World",
      &[WIF_PRIVATE_KEY],
      None,
      LockParams::default(),
    )
    .unwrap(),
  ));
}

#[test]
fn adding_aux_randomness_roundtrips() {
  let address = Address::from_str(TAPROOT_ADDRESS).unwrap().assume_checked();
  let message = "Hello World with aux randomness";
  let to_spend = create_to_spend(&address, message);
  let to_sign = create_to_sign(&to_spend, None, LockParams::default());
  let private_key = PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap();

  let mut aux_rand = [0u8; 32];
  rand::rng().fill_bytes(&mut aux_rand);

  let prevouts = [TxOut {
    value: Amount::ZERO,
    script_pubkey: to_spend.output[0].script_pubkey.clone(),
  }];

  let witness =
    create_message_signature_taproot(&to_sign, &private_key, &prevouts, 0, Some(aux_rand)).unwrap();

  assert!(matches!(
    verify_simple(&address, message, witness),
    Verification::Valid { .. }
  ));
}

#[test]
fn roundtrip_p2wsh_2of2_simple() {
  assert_valid(crate::verify::verify_simple_encoded(
    P2WSH_2OF2_ADDRESS,
    P2WSH_2OF2_MESSAGE,
    &crate::sign::sign_simple_encoded(
      P2WSH_2OF2_ADDRESS,
      P2WSH_2OF2_MESSAGE,
      &[P2WSH_2OF2_PRIVATE_KEY_1, P2WSH_2OF2_PRIVATE_KEY_2],
      Some(P2WSH_2OF2_WITNESS_SCRIPT),
    )
    .unwrap(),
  ));
}

#[test]
fn roundtrip_p2wsh_2of2_shuffled_keys() {
  assert_valid(crate::verify::verify_simple_encoded(
    P2WSH_2OF2_ADDRESS,
    P2WSH_2OF2_MESSAGE,
    &crate::sign::sign_simple_encoded(
      P2WSH_2OF2_ADDRESS,
      P2WSH_2OF2_MESSAGE,
      &[P2WSH_2OF2_PRIVATE_KEY_2, P2WSH_2OF2_PRIVATE_KEY_1],
      Some(P2WSH_2OF2_WITNESS_SCRIPT),
    )
    .unwrap(),
  ));
}

#[test]
fn roundtrip_p2pkh_full() {
  assert_valid(crate::verify::verify_full_encoded(
    LEGACY_ADDRESS,
    "Hello World",
    &crate::sign::sign_full_encoded(
      LEGACY_ADDRESS,
      "Hello World",
      &[WIF_PRIVATE_KEY],
      None,
      LockParams::default(),
    )
    .unwrap(),
  ));
}

#[test]
fn single_sig_rejects_extra_keys() {
  assert!(matches!(
    crate::sign::sign_simple_encoded(
      SEGWIT_ADDRESS,
      "foo",
      &[WIF_PRIVATE_KEY, WIF_PRIVATE_KEY],
      None
    ),
    Err(Error::SignatureCount {
      required: 1,
      provided: 2
    })
  ));
}

#[test]
fn sign_p2wpkh_rejects_mismatched_key() {
  assert!(matches!(
    crate::sign::sign_simple(
      &Address::from_str(SEGWIT_ADDRESS).unwrap().assume_checked(),
      "foo",
      &[PrivateKey::from_wif(NESTED_SEGWIT_WIF_PRIVATE_KEY).unwrap()],
      None,
    ),
    Err(Error::PublicKeyMismatch)
  ));
}

#[test]
fn sign_p2pkh_rejects_mismatched_key() {
  assert!(matches!(
    crate::sign::sign_full(
      &Address::from_str(LEGACY_ADDRESS).unwrap().assume_checked(),
      "foo",
      &[PrivateKey::from_wif(NESTED_SEGWIT_WIF_PRIVATE_KEY).unwrap()],
      None,
      LockParams::default()
    ),
    Err(Error::PublicKeyMismatch)
  ));
}

#[test]
fn mismatched_keys_rejected_for_all_address_types() {
  use rand::{rngs::StdRng, SeedableRng};

  let secp = Secp256k1::new();
  let mut rng = StdRng::seed_from_u64(0);

  let mut key = || loop {
    let mut bytes = [0; 32];
    rng.fill_bytes(&mut bytes);
    if let Ok(secret_key) = secp256k1::SecretKey::from_slice(&bytes) {
      break PrivateKey::new(secret_key, bitcoin::Network::Bitcoin);
    }
  };

  for _ in 0..10 {
    let k1 = key();
    let k2 = key();

    let pub_key = k1.public_key(&secp);
    let compressed_public_key = bitcoin::CompressedPublicKey::try_from(pub_key).unwrap();
    let (x_only_public_key, _parity) =
      XOnlyPublicKey::from_keypair(&Keypair::from_secret_key(&secp, &k1.inner));

    let addresses = [
      Address::p2wpkh(&compressed_public_key, bitcoin::Network::Bitcoin),
      Address::p2shwpkh(&compressed_public_key, bitcoin::Network::Bitcoin),
      Address::p2pkh(pub_key, bitcoin::Network::Bitcoin),
      Address::p2tr(&secp, x_only_public_key, None, bitcoin::Network::Bitcoin),
    ];

    for address in addresses {
      assert!(
        crate::sign::sign_full(&address, "foo", &[k2], None, LockParams::default()).is_err(),
        "wrong key was accepted for {address}"
      );
    }
  }
}

#[test]
fn multisig_rejects_duplicate_signer() {
  assert!(matches!(
    crate::sign::sign_simple_encoded(
      P2WSH_2OF2_ADDRESS,
      "foo",
      &[P2WSH_2OF2_PRIVATE_KEY_1, P2WSH_2OF2_PRIVATE_KEY_1],
      Some(P2WSH_2OF2_WITNESS_SCRIPT),
    ),
    Err(Error::DuplicateSigner)
  ));
}

#[test]
fn sign_rejects_no_private_keys() {
  let keys: &[&str] = &[];

  assert!(matches!(
    crate::sign::sign_simple_encoded(SEGWIT_ADDRESS, "foo", keys, None),
    Err(Error::NoPrivateKeys)
  ));
}

#[test]
fn sign_p2wsh_rejects_missing_witness_script() {
  assert!(matches!(
    crate::sign::sign_simple_encoded(
      P2WSH_2OF2_ADDRESS,
      "foo",
      &[P2WSH_2OF2_PRIVATE_KEY_1, P2WSH_2OF2_PRIVATE_KEY_2],
      None,
    ),
    Err(Error::InvalidWitness)
  ))
}

#[test]
fn public_signing_helpers_reject_out_of_range_inputs() {
  let address = Address::from_str(SEGWIT_ADDRESS).unwrap().assume_checked();
  let to_spend = create_to_spend(&address, "foo");
  let mut psbt = create_to_sign(&to_spend, None, LockParams::default());
  let private_key = PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap();
  let private_keys = [private_key];
  let script = ScriptBuf::from_hex(P2WSH_2OF2_WITNESS_SCRIPT).unwrap();

  assert!(matches!(
    create_message_signature_p2wpkh(&psbt, &private_key, &to_spend.output[0], 1, false),
    Err(Error::ToSignInvalid)
  ));
  assert!(matches!(
    create_message_signature_taproot(&psbt, &private_key, &to_spend.output, 1, None),
    Err(Error::ToSignInvalid)
  ));
  assert!(matches!(
    create_message_signature_taproot(&psbt, &private_key, &[], 0, None),
    Err(Error::ToSignInvalid)
  ));
  assert!(matches!(
    create_message_signature_p2wsh(&psbt, &private_keys, &script, &to_spend.output[0], 1),
    Err(Error::ToSignInvalid)
  ));
  assert!(matches!(
    create_message_signature_p2sh_multisig(&mut psbt, &private_keys, &script, 1),
    Err(Error::ToSignInvalid)
  ));
  assert!(matches!(
    create_message_signature_p2pkh(&mut psbt, &private_key, &to_spend.output[0], 1),
    Err(Error::ToSignInvalid)
  ));
}

#[test]
fn sign_and_finalize_psbt_reject_invalid_additional_outpoints() {
  let address = Address::from_str(SEGWIT_ADDRESS).unwrap().assume_checked();
  let build = || {
    let second = ProofInput {
      outpoint: OutPoint {
        txid: "2222222222222222222222222222222222222222222222222222222222222222"
          .parse()
          .unwrap(),
        vout: 0,
      },
      ..pof_p2tr_proof_input()
    };
    create_bip322_psbt(
      &address,
      "foo",
      None,
      &[pof_p2tr_proof_input(), second],
      LockParams::default(),
    )
    .unwrap()
  };

  let mut null = build();
  null.unsigned_tx.input[1].previous_output = OutPoint::default();
  let mut duplicate = build();
  duplicate.unsigned_tx.input[2].previous_output = duplicate.unsigned_tx.input[1].previous_output;

  for psbt in [null, duplicate] {
    let mut psbt = Psbt::deserialize(&psbt.serialize()).unwrap();
    assert!(matches!(
      sign_bip322_psbt_input(
        &mut psbt,
        &PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap(),
        0,
      ),
      Err(Error::ToSignInvalid)
    ));
    assert!(matches!(
      finalize_bip322_psbt(psbt),
      Err(Error::ToSignInvalid)
    ));
  }
}
