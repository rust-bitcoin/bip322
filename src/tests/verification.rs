use super::fixtures::*;
use super::*;
use pretty_assertions::assert_eq;

#[test]
fn simple_verify_and_falsify_taproot() {
  assert_valid(crate::verify::verify_simple_encoded(
      TAPROOT_ADDRESS,
      "Hello World", 
      "smpAUHd69PrJQEv+oKTfZ8l+WROBHuy9HKrbFCJu7U1iK2iiEy1vMU5EfMtjc+VSHM7aU0SDbak5IUZRVno2P5mjSafAQ=="
  ));

  assert!(matches!(
    crate::verify::verify_simple_encoded(
      TAPROOT_ADDRESS,
      "Hello World -- This should fail",
      "smpAUHd69PrJQEv+oKTfZ8l+WROBHuy9HKrbFCJu7U1iK2iiEy1vMU5EfMtjc+VSHM7aU0SDbak5IUZRVno2P5mjSafAQ=="
    ),
    Verification::Invalid(_)
  ));
}

#[test]
fn simple_verify_and_falsify_p2wpkh() {
  assert_valid(crate::verify::verify_simple_encoded(
      SEGWIT_ADDRESS,
      "Hello World",
      "smpAkcwRAIgZRfIY3p7/DoVTty6YZbWS71bc5Vct9p9Fia83eRmw2QCICK/ENGfwLtptFluMGs2KsqoNSk89pO7F29zJLUx9a/sASECx/EgAxlkQpQ9hYjgGu6EBCPMVPwVIVJqO4XCsMvViHI="
  ));

  assert!(matches!(
    crate::verify::verify_simple_encoded(
      SEGWIT_ADDRESS,
      "Hello World - this should fail",
      "smpAkcwRAIgZRfIY3p7/DoVTty6YZbWS71bc5Vct9p9Fia83eRmw2QCICK/ENGfwLtptFluMGs2KsqoNSk89pO7F29zJLUx9a/sASECx/EgAxlkQpQ9hYjgGu6EBCPMVPwVIVJqO4XCsMvViHI="
    ),
    Verification::Invalid(_)
  ));

  assert_valid(crate::verify::verify_simple_encoded(
      SEGWIT_ADDRESS,
      "Hello World",
      "smpAkgwRQIhAOzyynlqt93lOKJr+wmmxIens//zPzl9tqIOua93wO6MAiBi5n5EyAcPScOjf1lAqIUIQtr3zKNeavYabHyR8eGhowEhAsfxIAMZZEKUPYWI4BruhAQjzFT8FSFSajuFwrDL1Yhy"
  ));

  assert_valid(crate::verify::verify_simple_encoded(
      SEGWIT_ADDRESS,
      "",
      "smpAkcwRAIgM2gBAQqvZX15ZiysmKmQpDrG83avLIT492QBzLnQIxYCIBaTpOaD20qRlEylyxFSeEA2ba9YOixpX8z46TSDtS40ASECx/EgAxlkQpQ9hYjgGu6EBCPMVPwVIVJqO4XCsMvViHI="
  ));

  assert!(matches!(
    crate::verify::verify_simple_encoded(
      SEGWIT_ADDRESS,
      "fail",
      "smpAkcwRAIgM2gBAQqvZX15ZiysmKmQpDrG83avLIT492QBzLnQIxYCIBaTpOaD20qRlEylyxFSeEA2ba9YOixpX8z46TSDtS40ASECx/EgAxlkQpQ9hYjgGu6EBCPMVPwVIVJqO4XCsMvViHI="
    ),
    Verification::Invalid(_)
  ));

  assert_valid(crate::verify::verify_simple_encoded(
      SEGWIT_ADDRESS,
      "",
      "smpAkgwRQIhAPkJ1Q4oYS0htvyuSFHLxRQpFAY56b70UvE7Dxazen0ZAiAtZfFz1S6T6I23MWI2lK/pcNTWncuyL8UL+oMdydVgzAEhAsfxIAMZZEKUPYWI4BruhAQjzFT8FSFSajuFwrDL1Yhy"
  ));
}

#[test]
fn verify_p2wpkh_signature_shorter_than_71_bytes() {
  // ECDSA signatures are not fixed length: this signature's DER encoding is 69
  // bytes (r serializes to 31 bytes), i.e. 70 bytes with the sighash flag, below
  // the usual 71/72. It is valid and `sign_simple` produces it, so `verify`
  // must accept it. Regenerate with:
  //   crate::sign::sign_simple_encoded(SEGWIT_ADDRESS, "probe-266", WIF_PRIVATE_KEY)
  assert_valid(crate::verify::verify_simple_encoded(
      SEGWIT_ADDRESS,
      "probe-266",
      "AkYwQwIgdHvqo7c5BbXCr0O5xWkT1qoihgF5oaKXoFlzuegR+ZICHxoQGPcMKj+iUTymjR5tC+uN7arZcZHUv7BMyf6rwJoBIQLH8SADGWRClD2FiOAa7oQEI8xU/BUhUmo7hcKwy9WIcg=="
  ));
}

#[test]
fn multisig_rejects_unknown_signer() {
  assert!(matches!(
    crate::sign::sign_simple_encoded(
      P2WSH_2OF2_ADDRESS,
      P2WSH_2OF2_MESSAGE,
      &[P2WSH_2OF2_PRIVATE_KEY_1, WIF_PRIVATE_KEY],
      Some(P2WSH_2OF2_WITNESS_SCRIPT),
    ),
    Err(Error::UnknownSigner)
  ));
}

#[test]
fn multisig_rejects_mismatched_witness_script() {
  assert!(matches!(
    crate::sign::sign_simple_encoded(
      P2WSH_2OF2_ADDRESS,
      "foo",
      &[P2WSH_2OF2_PRIVATE_KEY_1, P2WSH_2OF2_PRIVATE_KEY_2],
      Some(P2SH_P2WSH_2OF2_WITNESS_SCRIPT),
    ),
    Err(Error::WitnessScriptMismatch)
  ));
}

#[test]
fn p2pkh_simple_unsupported() {
  assert!(matches!(
    crate::sign::sign_simple_encoded(LEGACY_ADDRESS, "Hello World", &[WIF_PRIVATE_KEY], None),
    Err(Error::SimpleFormatUnsupported { .. })
  ));
}

#[test]
fn verify_full_rejects_noncanonical_to_sign() {
  #[track_caller]
  fn case(mutate: impl Fn(&mut Transaction)) {
    let (address, mut to_sign) = full_p2wpkh_to_sign();

    mutate(&mut to_sign);

    assert!(matches!(
      crate::verify::verify_full(&address, "foo", to_sign),
      Verification::Invalid(Error::ToSignInvalid)
    ));
  }

  case(|tx| {
    let input = tx.input[0].clone();
    tx.input.push(input);
  });
  case(|tx| {
    let output = tx.output[0].clone();
    tx.output.push(output);
  });
  case(|tx| tx.input[0].script_sig = ScriptBuf::from_hex("deadbeef").unwrap());
  case(|tx| tx.output[0].value = Amount::from_sat(1));
  case(|tx| tx.output[0].script_pubkey = ScriptBuf::new());
}

#[test]
fn full_proof_is_bound_to_message() {
  let (address, to_sign) = full_p2wpkh_to_sign();
  assert_valid(verify_full(&address, "foo", to_sign.clone()));
  assert!(matches!(
    verify_full(&address, "different message", to_sign),
    Verification::Invalid(Error::ToSignInvalid)
  ));

  assert_valid(verify_full_encoded(
    FULL_P2WPKH_ADDRESS,
    FULL_P2WPKH_MESSAGE,
    FULL_P2WPKH_SIGNATURE,
  ));
  assert!(matches!(
    verify_full_encoded(
      FULL_P2WPKH_ADDRESS,
      "different message",
      FULL_P2WPKH_SIGNATURE
    ),
    Verification::Invalid(Error::ToSignInvalid)
  ));
}

#[test]
fn verify_full_rejects_inputless_transaction() {
  let to_sign = Transaction {
    version: Version(0),
    lock_time: LockTime::ZERO,
    input: Vec::new(),
    output: Vec::new(),
  };

  assert!(matches!(
    crate::verify::verify_full(
      &Address::from_str(TAPROOT_ADDRESS).unwrap().assume_checked(),
      "foo",
      to_sign
    ),
    Verification::Invalid(Error::ToSignInvalid)
  ));
}

#[test]
fn verify_multisig_rejects_wrong_signature_count() {
  let address = Address::from_str(P2WSH_2OF2_ADDRESS)
    .unwrap()
    .assume_checked();

  let items = p2wsh_2of2_witness(&address).to_vec();

  let mut witness = Witness::new();
  witness.push::<&[u8]>(&[]);
  witness.push(&items[1]);
  witness.push(&items[3]);

  assert!(matches!(
    crate::verify::verify_simple(&address, P2WSH_2OF2_MESSAGE, witness),
    Verification::Invalid(Error::InvalidWitness)
  ));
}

#[test]
fn verify_multisig_rejects_out_of_order_signatures() {
  let address = Address::from_str(P2WSH_2OF2_ADDRESS)
    .unwrap()
    .assume_checked();

  let items = p2wsh_2of2_witness(&address).to_vec();

  let mut witness = Witness::new();
  witness.push::<&[u8]>(&[]);
  witness.push(&items[2]);
  witness.push(&items[1]);
  witness.push(&items[3]);

  assert!(matches!(
    crate::verify::verify_simple(&address, P2WSH_2OF2_MESSAGE, witness),
    Verification::Invalid(Error::SignatureInvalid { .. })
  ));
}

#[test]
fn verify_multisig_rejects_tampered_witness_script() {
  let address = Address::from_str(P2WSH_2OF2_ADDRESS)
    .unwrap()
    .assume_checked();

  let items = p2wsh_2of2_witness(&address).to_vec();

  let mut script = items[3].clone();
  script[5] ^= 1;

  let mut witness = Witness::new();
  witness.push::<&[u8]>(&[]);
  witness.push(&items[1]);
  witness.push(&items[2]);
  witness.push(script);

  assert!(matches!(
    crate::verify::verify_simple(&address, P2WSH_2OF2_MESSAGE, witness),
    Verification::Invalid(Error::ToSignInvalid)
  ));
}

#[test]
fn verify_p2wpkh_rejects_mismatched_key() {
  let victim = Address::from_str("bc1qqthe0hz8klx90e7stf6shclhsvqd5ly96pn53v")
    .unwrap()
    .assume_checked();

  let pub_key = PrivateKey::from_wif(WIF_PRIVATE_KEY)
    .unwrap()
    .public_key(&Secp256k1::new());

  let mut witness = Witness::new();
  witness.push(vec![0; 71]);
  witness.push(pub_key.to_bytes());

  assert!(matches!(
    crate::verify::verify_simple(&victim, "foo", witness),
    Verification::Invalid(Error::PublicKeyMismatch)
  ));
}

#[test]
fn verify_p2pkh_rejects_mismatched_key() {
  let address = Address::from_str(LEGACY_ADDRESS).unwrap().assume_checked();

  let to_spend = create_to_spend(&address, "foo");

  let mut to_sign = create_to_sign(&to_spend, None, LockParams::default())
    .extract_tx()
    .unwrap();

  let pub_key = PrivateKey::from_wif(NESTED_SEGWIT_WIF_PRIVATE_KEY)
    .unwrap()
    .public_key(&Secp256k1::new());

  to_sign.input[0].script_sig = ScriptBuf::builder()
    .push_slice(push_bytes(&[0; 71]))
    .push_slice(push_bytes(&pub_key.to_bytes()))
    .into_script();

  assert!(matches!(
    crate::verify::verify_full(&address, "foo", to_sign),
    Verification::Invalid(Error::PublicKeyMismatch)
  ));
}

#[test]
fn verify_rejects_non_sighash_all_signatures() {
  let key = PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap();

  let p2wpkh = Address::from_str(SEGWIT_ADDRESS).unwrap().assume_checked();
  let mut items = crate::sign::sign_simple(&p2wpkh, "foo", &[key], None)
    .unwrap()
    .to_vec();
  *items[0].last_mut().unwrap() = 0x02;
  assert!(matches!(
    crate::verify::verify_simple(&p2wpkh, "foo", Witness::from_slice(&items)),
    Verification::Invalid(Error::SigHashTypeUnsupported { .. })
  ));

  let p2tr = Address::from_str(TAPROOT_ADDRESS).unwrap().assume_checked();
  let mut items = crate::sign::sign_simple(&p2tr, "foo", &[key], None)
    .unwrap()
    .to_vec();
  *items[0].last_mut().unwrap() = 0x02;
  assert!(matches!(
    crate::verify::verify_simple(&p2tr, "foo", Witness::from_slice(&items)),
    Verification::Invalid(Error::SigHashTypeUnsupported { .. })
  ));

  let p2wsh = Address::from_str(P2WSH_2OF2_ADDRESS)
    .unwrap()
    .assume_checked();
  let mut items = p2wsh_2of2_witness(&p2wsh).to_vec();
  *items[1].last_mut().unwrap() = 0x02;
  assert!(matches!(
    crate::verify::verify_simple(&p2wsh, P2WSH_2OF2_MESSAGE, Witness::from_slice(&items)),
    Verification::Invalid(Error::SigHashTypeUnsupported { .. })
  ));
}

#[test]
fn verify_full_p2tr_rejects_script_sig() {
  let address = Address::from_str(TAPROOT_ADDRESS).unwrap().assume_checked();

  let mut to_sign = crate::sign::sign_full(
    &address,
    "foo",
    &[PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap()],
    None,
    LockParams::default(),
  )
  .unwrap();

  to_sign.input[0].script_sig = ScriptBuf::from_hex("deadbeef").unwrap();

  assert!(matches!(
    crate::verify::verify_full(&address, "foo", to_sign),
    Verification::Invalid(Error::ToSignInvalid)
  ));
}

#[test]
fn multisig_rejects_wrong_key_count() {
  assert!(matches!(
    crate::sign::sign_simple_encoded(
      P2WSH_2OF2_ADDRESS,
      "foo",
      &[P2WSH_2OF2_PRIVATE_KEY_1],
      Some(P2WSH_2OF2_WITNESS_SCRIPT),
    ),
    Err(Error::SignatureCount {
      required: 2,
      provided: 1
    })
  ));
}

#[test]
fn verify_rejects_mismatched_variant_prefix() {
  #[track_caller]
  fn mismatch(result: Verification) {
    assert!(
      matches!(
        result,
        Verification::Invalid(Error::SignatureVariantMismatch { .. })
      ),
      "got {result:?}"
    );
  }

  let simple =
    crate::sign::sign_simple_encoded(SEGWIT_ADDRESS, "Hello World", &[WIF_PRIVATE_KEY], None)
      .unwrap();

  let full = crate::sign::sign_full_encoded(
    SEGWIT_ADDRESS,
    "Hello World",
    &[WIF_PRIVATE_KEY],
    None,
    LockParams::default(),
  )
  .unwrap();

  let proof_inputs = vec![ProofInput {
    outpoint: OutPoint {
      txid: "3333333333333333333333333333333333333333333333333333333333333333"
        .parse()
        .unwrap(),
      vout: 1,
    },
    prevout: TxOut {
      value: Amount::from_sat(345678),
      script_pubkey: ScriptBuf::from_hex(
        "51205c2badbb20cebdce218800dda2fed598e51fab8c30e87112ec967a340b9c3099",
      )
      .unwrap(),
    },
    prev_tx: None,
    private_keys: vec![PrivateKey::from_wif(POF_P2TR_PROVEN_KEY_3).unwrap()],
    witness_script: None,
  }];

  let pof = crate::sign::sign_pof_encoded(
    SEGWIT_ADDRESS,
    "Hello World",
    &[WIF_PRIVATE_KEY],
    None,
    &proof_inputs,
    LockParams::default(),
  )
  .unwrap();

  mismatch(crate::verify::verify_full_encoded(
    SEGWIT_ADDRESS,
    "Hello World",
    &simple,
  ));
  mismatch(crate::verify::verify_simple_encoded(
    SEGWIT_ADDRESS,
    "Hello World",
    &full,
  ));
  mismatch(crate::verify::verify_simple_encoded(
    SEGWIT_ADDRESS,
    "Hello World",
    &pof,
  ));
  mismatch(crate::verify::verify_pof_encoded(
    SEGWIT_ADDRESS,
    "Hello World",
    &simple,
  ));
  mismatch(crate::verify::verify_pof_encoded(
    SEGWIT_ADDRESS,
    "Hello World",
    &full,
  ));
}

#[test]
fn verification_predicates() {
  let signature =
    crate::sign::sign_simple_encoded(SEGWIT_ADDRESS, "Hello World", &[WIF_PRIVATE_KEY], None)
      .unwrap();

  let valid = crate::verify::verify_simple_encoded(SEGWIT_ADDRESS, "Hello World", &signature);
  assert!(valid.is_valid());
  assert!(!valid.is_inconclusive());
  assert!(!valid.is_invalid());

  let invalid = crate::verify::verify_simple_encoded(SEGWIT_ADDRESS, "wrong message", &signature);
  assert!(!invalid.is_valid());
  assert!(!invalid.is_inconclusive());
  assert!(invalid.is_invalid());
}

#[test]
fn unknown_witness_version_is_inconclusive() {
  let program = bitcoin::WitnessProgram::new(bitcoin::WitnessVersion::V2, &[0u8; 32]).unwrap();
  let address = Address::from_witness_program(program, bitcoin::Network::Bitcoin);
  let to_sign = create_to_sign(
    &create_to_spend(&address, "msg"),
    None,
    LockParams::default(),
  )
  .extract_tx_unchecked_fee_rate();
  assert!(matches!(
    verify_full(&address, "msg", to_sign.clone()),
    Verification::Inconclusive
  ));

  let mut invalid = to_sign;
  invalid.input[0].script_sig = ScriptBuf::builder()
    .push_opcode(opcodes::all::OP_PUSHNUM_1)
    .into_script();
  assert!(matches!(
    verify_full(&address, "msg", invalid),
    Verification::Invalid(Error::ToSignInvalid)
  ));
}

#[test]
fn timelocked_full_signature_reports_time_and_age() {
  let locks = LockParams {
    lock_time: LockTime::from_height(800_000).unwrap(),
    sequence: Sequence(144),
  };

  assert!(matches!(
    crate::verify::verify_full_encoded(
      SEGWIT_ADDRESS,
      "Hello World",
      &crate::sign::sign_full_encoded(
        SEGWIT_ADDRESS,
        "Hello World",
        &[WIF_PRIVATE_KEY],
        None,
        locks
      )
      .unwrap()
    ),
    Verification::Valid { time, age }
      if time == locks.lock_time && age == locks.sequence
  ));
}

#[test]
fn unknown_transaction_version_is_inconclusive_only_after_required_rules() {
  let (address, mut invalid_signature) = full_p2wpkh_to_sign();
  invalid_signature.version = Version(3);

  // Changing the version invalidates the signature, which is a required-rule
  // failure and therefore takes precedence over the version upgrade rule.
  assert!(matches!(
    crate::verify::verify_full(&address, "foo", invalid_signature),
    Verification::Invalid(Error::SignatureInvalid { .. })
  ));

  let to_spend = create_to_spend(&address, "foo");
  let mut psbt = create_to_sign(&to_spend, None, LockParams::default());
  psbt.unsigned_tx.version = Version(3);
  let witness = create_message_signature_p2wpkh(
    &psbt,
    &PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap(),
    &to_spend.output[0],
    0,
    false,
  )
  .unwrap();
  psbt.inputs[0].final_script_witness = Some(witness);

  assert!(matches!(
    crate::verify::verify_full(&address, "foo", psbt.extract_tx().unwrap()),
    Verification::Inconclusive
  ));
}

#[test]
fn verify_rejects_high_s_signature() {
  let address = Address::from_str(SEGWIT_ADDRESS).unwrap().assume_checked();

  let mut items = crate::sign::sign_simple(
    &address,
    "foo",
    &[PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap()],
    None,
  )
  .unwrap()
  .to_vec();

  let (sighash_byte, der) = items[0].split_last().unwrap();
  let sighash_byte = *sighash_byte;

  let signature = secp256k1::ecdsa::Signature::from_der(der).unwrap();

  assert!(require_low_s(&signature).is_ok());

  let mut compact = signature.serialize_compact();

  let mut borrow = 0i16;
  for i in (0..32).rev() {
    let diff = secp256k1::constants::CURVE_ORDER[i] as i16 - compact[32 + i] as i16 - borrow;
    compact[32 + i] = diff.rem_euclid(256) as u8;
    borrow = i16::from(diff < 0);
  }

  let high_s = secp256k1::ecdsa::Signature::from_compact(&compact).unwrap();

  assert!(require_low_s(&high_s).is_err());

  let mut der = high_s.serialize_der().to_vec();
  der.push(sighash_byte);
  items[0] = der;

  assert!(matches!(
    crate::verify::verify_simple(&address, "foo", Witness::from_slice(&items)),
    Verification::Invalid(Error::SignatureInvalid { .. })
  ));
}

#[test]
fn verify_p2pkh_rejects_non_minimal_push() {
  let address = Address::from_str(LEGACY_ADDRESS).unwrap().assume_checked();

  let mut to_sign = crate::sign::sign_full(
    &address,
    "foo",
    &[PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap()],
    None,
    LockParams::default(),
  )
  .unwrap();

  assert!(matches!(
    verify_full(&address, "foo", to_sign.clone()),
    Verification::Valid { .. }
  ));

  let mut instructions = to_sign.input[0].script_sig.instructions();

  let mut next_push = || match instructions.next() {
    Some(Ok(Instruction::PushBytes(b))) => b.as_bytes().to_vec(),
    other => panic!("expected a push, got {other:?}"),
  };

  let signature = next_push();
  let pub_key = next_push();

  let mut bytes = vec![signature.len() as u8];
  bytes.extend_from_slice(&signature);
  bytes.push(opcodes::all::OP_PUSHDATA1.to_u8());
  bytes.push(pub_key.len() as u8);
  bytes.extend_from_slice(&pub_key);

  to_sign.input[0].script_sig = ScriptBuf::from_bytes(bytes);

  assert!(matches!(
    crate::verify::verify_full(&address, "foo", to_sign),
    Verification::Invalid(Error::InvalidWitness)
  ));
}

#[test]
fn p2wsh_non_minimal_multisig_pubkey_push_is_invalid() {
  let private_key = PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap();
  let public_key = private_key.public_key(&Secp256k1::new());
  let multisig = non_minimal_one_of_one_multisig(&public_key);
  let (address, mut tx, signature) = p2wsh_interpreter_spend(
    &multisig,
    &private_key,
    EcdsaSighashType::All,
    LockParams::default(),
  );
  tx.input[0].witness =
    Witness::from_slice(&[Vec::new(), signature.to_vec(), multisig.as_bytes().to_vec()]);

  let result = verify_full(&address, "foo", tx);
  assert!(
    matches!(result, Verification::Invalid(Error::InvalidWitness)),
    "got {result:?}"
  );
}

#[test]
fn verify_p2tr_malformed_control_block_is_invalid() {
  let address = Address::from_str(TAPROOT_ADDRESS).unwrap().assume_checked();

  let mut to_sign = crate::sign::sign_full(
    &address,
    "foo",
    &[PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap()],
    None,
    LockParams::default(),
  )
  .unwrap();

  to_sign.input[0].witness.push([0u8; 32]);

  assert!(matches!(
    crate::verify::verify_full(&address, "foo", to_sign),
    Verification::Invalid(Error::InvalidWitness)
  ));
}

#[test]
fn verify_simple_reports_default_locks() {
  let address = Address::from_str(SEGWIT_ADDRESS).unwrap().assume_checked();

  let signature = crate::sign::sign_simple(
    &address,
    "foo",
    &[PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap()],
    None,
  )
  .unwrap();

  assert!(matches!(
    crate::verify::verify_simple(&address, "foo", signature),
    Verification::Valid {
      time: LockTime::ZERO,
      age: Sequence(0),
    }
  ));
}

#[test]
fn multiparty_roundtrips() {
  #[track_caller]
  fn roundtrip(address: &str, message: &str, keys: &[&str], witness_script: Option<&str>) {
    let parsed_address = Address::from_str(address).unwrap().assume_checked();
    let witness_script = witness_script.map(|hex| ScriptBuf::from_hex(hex).unwrap());

    let created = create_bip322_psbt(
      &parsed_address,
      message,
      witness_script.as_ref(),
      &[],
      LockParams::default(),
    )
    .unwrap()
    .serialize();

    let mut psbt = Psbt::deserialize(&created).unwrap();

    for key in keys {
      let mut next = Psbt::deserialize(&psbt.serialize()).unwrap();
      let detected =
        sign_bip322_psbt_input(&mut next, &PrivateKey::from_wif(key).unwrap(), 0).unwrap();
      assert_eq!(detected.message, message.as_bytes());
      assert_eq!(detected.message_challenge, parsed_address.script_pubkey());
      psbt = next;
    }

    let encoded = finalize_bip322_psbt(Psbt::deserialize(&psbt.serialize()).unwrap()).unwrap();

    assert!(matches!(
      verify_full_encoded(address, message, &encoded),
      Verification::Valid { .. }
    ));
  }

  roundtrip(TAPROOT_ADDRESS, "Hello World", &[WIF_PRIVATE_KEY], None);
  roundtrip(SEGWIT_ADDRESS, "Hello World", &[WIF_PRIVATE_KEY], None);
  roundtrip(LEGACY_ADDRESS, "Hello World", &[WIF_PRIVATE_KEY], None);
  roundtrip(
    NESTED_SEGWIT_ADDRESS,
    "Hello World",
    &[NESTED_SEGWIT_WIF_PRIVATE_KEY],
    None,
  );
  roundtrip(
    P2WSH_2OF2_ADDRESS,
    P2WSH_2OF2_MESSAGE,
    &[P2WSH_2OF2_PRIVATE_KEY_1, P2WSH_2OF2_PRIVATE_KEY_2],
    Some(P2WSH_2OF2_WITNESS_SCRIPT),
  );
  roundtrip(
    P2SH_MULTISIG_2OF2_ADDRESS,
    "foo",
    &[
      P2SH_MULTISIG_2OF2_PRIVATE_KEY_1,
      P2SH_MULTISIG_2OF2_PRIVATE_KEY_2,
    ],
    Some(P2SH_MULTISIG_2OF2_REDEEM_SCRIPT),
  );
  roundtrip(
    P2SH_P2WSH_2OF2_ADDRESS,
    P2SH_P2WSH_2OF2_MESSAGE,
    &[P2SH_P2WSH_2OF2_PRIVATE_KEY_1, P2SH_P2WSH_2OF2_PRIVATE_KEY_2],
    Some(P2SH_P2WSH_2OF2_WITNESS_SCRIPT),
  );
}

#[test]
fn detection_requires_every_property() {
  let address = Address::from_str(SEGWIT_ADDRESS).unwrap().assume_checked();

  let build = || create_bip322_psbt(&address, "foo", None, &[], LockParams::default()).unwrap();

  assert!(detect_bip322_psbt(&build()).is_some());

  // no global message field
  let mut psbt = build();
  psbt.unknown.clear();
  assert!(detect_bip322_psbt(&psbt).is_none());

  // no UTXO field on the first input
  let mut psbt = build();
  psbt.inputs[0].witness_utxo = None;
  assert!(detect_bip322_psbt(&psbt).is_none());

  // the challenge output must carry zero value
  let mut psbt = build();
  psbt.inputs[0].witness_utxo.as_mut().unwrap().value = Amount::from_sat(1);
  assert!(detect_bip322_psbt(&psbt).is_none());

  // prevout.n != 0
  let mut psbt = build();
  psbt.unsigned_tx.input[0].previous_output.vout = 1;
  assert!(detect_bip322_psbt(&psbt).is_none());

  // prevout.hash != to_spend.txid
  let mut psbt = build();
  psbt.unsigned_tx.input[0].previous_output.txid =
    "1111111111111111111111111111111111111111111111111111111111111111"
      .parse()
      .unwrap();
  assert!(detect_bip322_psbt(&psbt).is_none());

  // more than one output
  let mut psbt = build();
  let output = psbt.unsigned_tx.output[0].clone();
  psbt.unsigned_tx.output.push(output);
  assert!(detect_bip322_psbt(&psbt).is_none());

  // non-zero output value
  let mut psbt = build();
  psbt.unsigned_tx.output[0].value = Amount::from_sat(1);
  assert!(detect_bip322_psbt(&psbt).is_none());

  // output is not OP_RETURN
  let mut psbt = build();
  psbt.unsigned_tx.output[0].script_pubkey = ScriptBuf::new();
  assert!(detect_bip322_psbt(&psbt).is_none());

  // output is OP_RETURN with appended data, not the bare OP_RETURN script
  let mut psbt = build();
  psbt.unsigned_tx.output[0].script_pubkey = bitcoin::script::Builder::new()
    .push_opcode(opcodes::all::OP_RETURN)
    .push_slice::<&PushBytes>([0x42].as_slice().try_into().unwrap())
    .into_script();
  assert!(detect_bip322_psbt(&psbt).is_none());

  // Transaction version is not part of BIP322 PSBT detection.
  let mut psbt = build();
  psbt.unsigned_tx.version = Version(3);
  assert!(detect_bip322_psbt(&psbt).is_some());
}

#[test]
fn multiparty_pof_roundtrip() {
  let address = Address::from_str(POF_P2TR_ADDRESS)
    .unwrap()
    .assume_checked();

  let proof_inputs = vec![pof_p2tr_proof_input()];

  // Creator serializes and sends.
  let created = create_bip322_psbt(
    &address,
    POF_P2TR_MESSAGE,
    None,
    &proof_inputs,
    LockParams::default(),
  )
  .unwrap()
  .serialize();

  let mut psbt = Psbt::deserialize(&created).unwrap();

  // Challenge signer, then the proof input's owner.
  let detected = sign_bip322_psbt_input(
    &mut psbt,
    &PrivateKey::from_wif(POF_P2TR_CHALLENGE_KEY).unwrap(),
    0,
  )
  .unwrap();

  assert_eq!(detected.message, POF_P2TR_MESSAGE.as_bytes());
  assert_eq!(detected.message_challenge, address.script_pubkey());

  let mut psbt = Psbt::deserialize(&psbt.serialize()).unwrap();

  sign_bip322_psbt_input(
    &mut psbt,
    &PrivateKey::from_wif(POF_P2TR_PROVEN_KEY_1).unwrap(),
    1,
  )
  .unwrap();

  let encoded = finalize_bip322_psbt(Psbt::deserialize(&psbt.serialize()).unwrap()).unwrap();

  assert!(encoded.starts_with(POF_SIGNATURE_PREFIX));

  assert!(matches!(
    verify_pof_encoded(POF_P2TR_ADDRESS, POF_P2TR_MESSAGE, &encoded),
    Verification::Valid { .. }
  ));
}

#[test]
fn multiparty_pof_multisig_roundtrip() {
  fn proof_input(address: &str, script: &str, keys: &[&str], id: u8) -> ProofInput {
    let address = Address::from_str(address).unwrap().assume_checked();
    let script = ScriptBuf::from_hex(script).unwrap();
    let prevout = TxOut {
      value: Amount::from_sat(345678),
      script_pubkey: address.script_pubkey(),
    };
    let prev_tx = Transaction {
      version: Version(2),
      lock_time: LockTime::ZERO,
      input: vec![TxIn::default()],
      output: vec![prevout.clone()],
    };
    let legacy = !spends_witness(
      &prevout.script_pubkey,
      Some(&p2sh_redeem_script(&prevout.script_pubkey, &script)),
    );
    ProofInput {
      outpoint: OutPoint {
        txid: if legacy {
          prev_tx.compute_txid()
        } else {
          bitcoin::Txid::from_byte_array([id; 32])
        },
        vout: 0,
      },
      prevout,
      prev_tx: legacy.then_some(prev_tx),
      private_keys: keys
        .iter()
        .map(|key| PrivateKey::from_wif(key).unwrap())
        .collect(),
      witness_script: Some(script),
    }
  }

  let proof_inputs = [
    proof_input(
      P2WSH_2OF2_ADDRESS,
      P2WSH_2OF2_WITNESS_SCRIPT,
      &[P2WSH_2OF2_PRIVATE_KEY_1, P2WSH_2OF2_PRIVATE_KEY_2],
      1,
    ),
    proof_input(
      P2SH_P2WSH_2OF2_ADDRESS,
      P2SH_P2WSH_2OF2_WITNESS_SCRIPT,
      &[P2SH_P2WSH_2OF2_PRIVATE_KEY_1, P2SH_P2WSH_2OF2_PRIVATE_KEY_2],
      2,
    ),
    proof_input(
      P2SH_MULTISIG_2OF2_ADDRESS,
      P2SH_MULTISIG_2OF2_REDEEM_SCRIPT,
      &[
        P2SH_MULTISIG_2OF2_PRIVATE_KEY_1,
        P2SH_MULTISIG_2OF2_PRIVATE_KEY_2,
      ],
      3,
    ),
  ];
  let address = Address::from_str(POF_P2TR_ADDRESS)
    .unwrap()
    .assume_checked();
  let mut psbt = Psbt::deserialize(
    &create_bip322_psbt(
      &address,
      POF_P2TR_MESSAGE,
      None,
      &proof_inputs,
      LockParams::default(),
    )
    .unwrap()
    .serialize(),
  )
  .unwrap();
  sign_bip322_psbt_input(
    &mut psbt,
    &PrivateKey::from_wif(POF_P2TR_CHALLENGE_KEY).unwrap(),
    0,
  )
  .unwrap();
  for (index, input) in proof_inputs.iter().enumerate() {
    for key in &input.private_keys {
      sign_bip322_psbt_input(&mut psbt, key, index + 1).unwrap();
    }
  }

  let encoded = finalize_bip322_psbt(psbt).unwrap();
  assert_valid(verify_pof_encoded(
    POF_P2TR_ADDRESS,
    POF_P2TR_MESSAGE,
    &encoded,
  ));
}

#[test]
fn naked_zero_timelock_scripts_are_invalid() {
  for opcode in [opcodes::all::OP_CSV, opcodes::all::OP_CLTV] {
    let witness_script = ScriptBuf::builder()
      .push_opcode(opcodes::OP_0)
      .push_opcode(opcode)
      .into_script();
    let address = Address::p2wsh(&witness_script, bitcoin::Network::Bitcoin);
    let to_spend = create_to_spend(&address, "foo");

    for version in [Version(0), Version(2)] {
      let mut tx = create_to_sign(&to_spend, None, LockParams::default()).unsigned_tx;
      tx.version = version;
      tx.input[0].witness = Witness::from_slice(&[witness_script.as_bytes().to_vec()]);
      assert!(matches!(
        verify_full(&address, "foo", tx),
        Verification::Invalid(Error::ScriptNotSatisfied)
      ));
    }

    let address = Address::p2sh(&witness_script, bitcoin::Network::Bitcoin).unwrap();
    let to_spend = create_to_spend(&address, "foo");
    let mut tx = create_to_sign(&to_spend, None, LockParams::default()).unsigned_tx;
    tx.input[0].script_sig = push_only_script(&witness_script);
    assert!(matches!(
      verify_full(&address, "foo", tx),
      Verification::Invalid(Error::ScriptNotSatisfied)
    ));
  }
}

#[test]
fn composed_zero_timelock_scripts_are_not_valid() {
  // Miniscript rejects zero timelocks, so these composed scripts are left
  // inconclusive rather than accepted.
  #[track_caller]
  fn inconclusive(result: Verification) {
    assert!(
      matches!(result, Verification::Inconclusive),
      "got {result:?}"
    );
  }

  let private_key = PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap();

  for opcode in [opcodes::all::OP_CSV, opcodes::all::OP_CLTV] {
    let script = ScriptBuf::builder()
      .push_opcode(opcodes::OP_0)
      .push_opcode(opcode)
      .push_opcode(opcodes::all::OP_VERIFY)
      .push_opcode(opcodes::all::OP_PUSHNUM_1)
      .into_script();

    let address = Address::p2wsh(&script, bitcoin::Network::Bitcoin);
    let to_spend = create_to_spend(&address, "foo");
    let mut tx = create_to_sign(&to_spend, None, LockParams::default()).unsigned_tx;
    tx.input[0].witness = Witness::from_slice(&[script.as_bytes().to_vec()]);
    inconclusive(verify_full(&address, "foo", tx));

    let address = Address::p2sh(&script, bitcoin::Network::Bitcoin).unwrap();
    let to_spend = create_to_spend(&address, "foo");
    let mut tx = create_to_sign(&to_spend, None, LockParams::default()).unsigned_tx;
    tx.input[0].script_sig = push_only_script(&script);
    inconclusive(verify_full(&address, "foo", tx));

    let (address, mut tx, _signature, control_block) =
      p2tr_script_path_spend(&script, &private_key, TapSighashType::Default);
    tx.input[0].witness = Witness::from_slice(&[script.as_bytes().to_vec(), control_block]);
    inconclusive(verify_full(&address, "foo", tx));
  }
}

#[test]
fn nested_witness_commitments_and_program_lengths_are_enforced() {
  let future = Address::from_witness_program(
    bitcoin::WitnessProgram::new(bitcoin::WitnessVersion::V2, &[7; 32]).unwrap(),
    bitcoin::Network::Bitcoin,
  )
  .script_pubkey();
  let address = Address::p2sh(&future, bitcoin::Network::Bitcoin).unwrap();
  let to_spend = create_to_spend(&address, "foo");
  let mut tx = create_to_sign(&to_spend, None, LockParams::default()).unsigned_tx;
  tx.input[0].script_sig = push_only_script(&future);
  assert!(matches!(
    verify_full(&address, "foo", tx.clone()),
    Verification::Inconclusive
  ));

  let wrong_address = Address::p2sh(&ScriptBuf::new(), bitcoin::Network::Bitcoin).unwrap();
  let wrong_to_spend = create_to_spend(&wrong_address, "foo");
  let mut wrong_tx = create_to_sign(&wrong_to_spend, None, LockParams::default()).unsigned_tx;
  wrong_tx.input[0].script_sig = push_only_script(&future);
  assert!(matches!(
    verify_full(&wrong_address, "foo", wrong_tx),
    Verification::Invalid(Error::ToSignInvalid)
  ));

  let malformed = ScriptBuf::from_bytes(vec![opcodes::OP_0.to_u8(), 2, 7, 7]);
  let (pof_address, mut psbt) = pof_with_p2wpkh_challenge(&[pof_p2tr_proof_input()]);
  psbt.inputs[1].witness_utxo.as_mut().unwrap().script_pubkey = malformed.clone();
  psbt.inputs[1].final_script_sig = None;
  psbt.inputs[1].final_script_witness = None;
  assert!(matches!(
    verify_pof(&pof_address, POF_P2TR_MESSAGE, psbt),
    Verification::Invalid(Error::ToSignInvalid)
  ));

  let address = Address::p2sh(&malformed, bitcoin::Network::Bitcoin).unwrap();
  let to_spend = create_to_spend(&address, "foo");
  let mut nested = create_to_sign(&to_spend, None, LockParams::default()).unsigned_tx;
  nested.input[0].script_sig = push_only_script(&malformed);
  assert!(matches!(
    verify_full(&address, "foo", nested),
    Verification::Invalid(Error::ToSignInvalid)
  ));
}

#[test]
fn p2wsh_multisig_requires_null_dummy() {
  let address = Address::from_str(P2WSH_2OF2_ADDRESS)
    .unwrap()
    .assume_checked();
  let mut items = p2wsh_2of2_witness(&address).to_vec();
  assert_valid(verify_simple(
    &address,
    P2WSH_2OF2_MESSAGE,
    Witness::from_slice(&items),
  ));

  // The element CHECKMULTISIG pops beyond the signatures must be empty.
  assert!(items[0].is_empty());
  let mut non_null_dummy = items.clone();
  non_null_dummy[0] = vec![1];
  assert!(matches!(
    verify_simple(
      &address,
      P2WSH_2OF2_MESSAGE,
      Witness::from_slice(&non_null_dummy)
    ),
    Verification::Invalid(Error::InvalidWitness)
  ));

  // Each of the required signatures must be present.
  items[2] = Vec::new();
  assert!(matches!(
    verify_simple(&address, P2WSH_2OF2_MESSAGE, Witness::from_slice(&items)),
    Verification::Invalid(Error::InvalidWitness)
  ));
}

#[test]
fn p2pkh_requires_sighash_all() {
  let address = Address::from_str(LEGACY_ADDRESS).unwrap().assume_checked();
  let to_sign = crate::sign::sign_full(
    &address,
    "foo",
    &[PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap()],
    None,
    LockParams::default(),
  )
  .unwrap();
  assert_valid(verify_full(&address, "foo", to_sign.clone()));

  // scriptSig: <signature> <public key>
  let mut instructions = to_sign.input[0].script_sig.instructions();
  let (Some(Ok(Instruction::PushBytes(signature))), Some(Ok(Instruction::PushBytes(public_key)))) =
    (instructions.next(), instructions.next())
  else {
    panic!("expected two pushes");
  };

  for sighash_type in [
    EcdsaSighashType::None,
    EcdsaSighashType::Single,
    EcdsaSighashType::AllPlusAnyoneCanPay,
  ] {
    let mut signature = signature.as_bytes().to_vec();
    *signature.last_mut().unwrap() = sighash_type as u8;
    let mut tampered = to_sign.clone();
    tampered.input[0].script_sig = ScriptBuf::builder()
      .push_slice(push_bytes(&signature))
      .push_slice(push_bytes(public_key.as_bytes()))
      .into_script();

    let result = verify_full(&address, "foo", tampered);
    assert!(
      matches!(
        result,
        Verification::Invalid(Error::SigHashTypeUnsupported { .. })
      ),
      "{sighash_type:?}: got {result:?}"
    );
  }
}
