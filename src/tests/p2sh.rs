use super::fixtures::*;
use super::*;

#[test]
fn simple_verify_rejects_p2sh_p2wpkh() {
  assert!(matches!(
    crate::verify::verify_simple_encoded(
      NESTED_SEGWIT_ADDRESS,
      "Hello World",
      "smpAkgwRQIhAMd2wZSY3x0V9Kr/NClochoTXcgDaGl3OObOR17yx3QQAiBVWxqNSS+CKen7bmJTG6YfJjsggQ4Fa2RHKgBKrdQQ+gEhAxa5UDdQCHSQHfKQv14ybcYm1C9y6b12xAuukWzSnS+w"
    ),
    Verification::Invalid(Error::SimpleFormatUnsupported { .. })
  ));
}

#[test]
fn simple_sign_rejects_p2sh_p2wpkh() {
  assert!(matches!(
    crate::sign::sign_simple_encoded(
      NESTED_SEGWIT_ADDRESS,
      "Hello World",
      &[NESTED_SEGWIT_WIF_PRIVATE_KEY],
      None
    ),
    Err(Error::SimpleFormatUnsupported { .. })
  ));
}

#[test]
fn roundtrip_p2sh_p2wpkh_full() {
  assert_valid(crate::verify::verify_full_encoded(
    NESTED_SEGWIT_ADDRESS,
    "Hello World",
    &crate::sign::sign_full_encoded(
      NESTED_SEGWIT_ADDRESS,
      "Hello World",
      &[NESTED_SEGWIT_WIF_PRIVATE_KEY],
      None,
      LockParams::default(),
    )
    .unwrap(),
  ));
}

#[test]
fn roundtrip_p2sh_p2wsh_2of2_full() {
  assert_valid(crate::verify::verify_full_encoded(
    P2SH_P2WSH_2OF2_ADDRESS,
    P2SH_P2WSH_2OF2_MESSAGE,
    &crate::sign::sign_full_encoded(
      P2SH_P2WSH_2OF2_ADDRESS,
      P2SH_P2WSH_2OF2_MESSAGE,
      &[P2SH_P2WSH_2OF2_PRIVATE_KEY_1, P2SH_P2WSH_2OF2_PRIVATE_KEY_2],
      Some(P2SH_P2WSH_2OF2_WITNESS_SCRIPT),
      LockParams::default(),
    )
    .unwrap(),
  ));
}

#[test]
fn roundtrip_p2sh_p2wsh_2of2_shuffled_keys() {
  assert_valid(crate::verify::verify_full_encoded(
    P2SH_P2WSH_2OF2_ADDRESS,
    P2SH_P2WSH_2OF2_MESSAGE,
    &crate::sign::sign_full_encoded(
      P2SH_P2WSH_2OF2_ADDRESS,
      P2SH_P2WSH_2OF2_MESSAGE,
      &[P2SH_P2WSH_2OF2_PRIVATE_KEY_2, P2SH_P2WSH_2OF2_PRIVATE_KEY_1],
      Some(P2SH_P2WSH_2OF2_WITNESS_SCRIPT),
      LockParams::default(),
    )
    .unwrap(),
  ));
}

#[test]
fn p2sh_p2wpkh_rejects_uncompressed_key() {
  assert!(matches!(
    crate::sign::sign_simple_encoded(
      NESTED_SEGWIT_ADDRESS,
      "foo",
      &[UNCOMPRESSED_WIF_PRIVATE_KEY],
      None
    ),
    Err(Error::SimpleFormatUnsupported { .. })
  ));
  assert!(matches!(
    crate::sign::sign_full_encoded(
      NESTED_SEGWIT_ADDRESS,
      "foo",
      &[UNCOMPRESSED_WIF_PRIVATE_KEY],
      None,
      LockParams::default(),
    ),
    Err(Error::UncompressedPublicKey { .. })
  ));
}

#[test]
fn verify_simple_rejects_legacy_p2sh_multisig() {
  assert!(matches!(
    crate::verify::verify_simple(
      &Address::from_str(P2SH_MULTISIG_2OF2_ADDRESS)
        .unwrap()
        .assume_checked(),
      "foo",
      Witness::new()
    ),
    Verification::Invalid(Error::SimpleFormatUnsupported { .. })
  ));
}

#[test]
fn sign_p2sh_p2wpkh_rejects_mismatched_key() {
  let victim = Address::from_str(P2SH_P2WSH_2OF2_ADDRESS)
    .unwrap()
    .assume_checked();

  let to_spend = create_to_spend(&victim, "foo");
  let to_sign = create_to_sign(&to_spend, None, LockParams::default());

  assert!(matches!(
    create_message_signature_p2wpkh(
      &to_sign,
      &PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap(),
      &to_spend.output[0],
      0,
      true,
    ),
    Err(Error::PublicKeyMismatch)
  ));
}

#[test]
fn verify_p2sh_p2wpkh_rejects_uncompressed_witness_key() {
  let address = Address::from_str(NESTED_SEGWIT_ADDRESS)
    .unwrap()
    .assume_checked();
  let mut to_sign = crate::sign::sign_full(
    &address,
    "foo",
    &[PrivateKey::from_wif(NESTED_SEGWIT_WIF_PRIVATE_KEY).unwrap()],
    None,
    LockParams::default(),
  )
  .unwrap();
  let pub_key = PrivateKey::from_wif(UNCOMPRESSED_WIF_PRIVATE_KEY)
    .unwrap()
    .public_key(&Secp256k1::new());

  to_sign.input[0].witness = Witness::from_slice(&[vec![0; 71], pub_key.to_bytes()]);

  assert!(matches!(
    crate::verify::verify_full(&address, "foo", to_sign),
    Verification::Invalid(Error::UncompressedPublicKey { .. })
  ));
}

#[test]
fn sign_simple_rejects_p2sh_p2wsh() {
  assert!(matches!(
    crate::sign::sign_simple_encoded(
      P2SH_P2WSH_2OF2_ADDRESS,
      "foo",
      &[P2SH_P2WSH_2OF2_PRIVATE_KEY_1, P2SH_P2WSH_2OF2_PRIVATE_KEY_2],
      Some(P2SH_P2WSH_2OF2_WITNESS_SCRIPT),
    ),
    Err(Error::SimpleFormatUnsupported { .. })
  ));
}

#[test]
fn roundtrip_p2sh_multisig_full() {
  assert_valid(crate::verify::verify_full_encoded(
    P2SH_MULTISIG_2OF2_ADDRESS,
    "foo",
    &crate::sign::sign_full_encoded(
      P2SH_MULTISIG_2OF2_ADDRESS,
      "foo",
      &[
        P2SH_MULTISIG_2OF2_PRIVATE_KEY_1,
        P2SH_MULTISIG_2OF2_PRIVATE_KEY_2,
      ],
      Some(P2SH_MULTISIG_2OF2_REDEEM_SCRIPT),
      LockParams::default(),
    )
    .unwrap(),
  ));
}

#[test]
fn bare_p2sh_rejects_uncommitted_redeem_script() {
  let victim = Address::from_str(P2SH_MULTISIG_2OF2_ADDRESS)
    .unwrap()
    .assume_checked();
  let mut to_sign = crate::sign::sign_full(
    &victim,
    "foo",
    &[
      PrivateKey::from_wif(P2SH_MULTISIG_2OF2_PRIVATE_KEY_1).unwrap(),
      PrivateKey::from_wif(P2SH_MULTISIG_2OF2_PRIVATE_KEY_2).unwrap(),
    ],
    Some(&ScriptBuf::from_hex(P2SH_MULTISIG_2OF2_REDEEM_SCRIPT).unwrap()),
    LockParams::default(),
  )
  .unwrap();
  assert_valid(verify_full(&victim, "foo", to_sign.clone()));

  // The attacker validly signs a 1-of-1 multisig of their own key over the
  // victim's to_sign, but the victim's address does not commit to it.
  let attacker = PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap();
  let redeem_script = ScriptBuf::builder()
    .push_opcode(opcodes::all::OP_PUSHNUM_1)
    .push_key(&attacker.public_key(&Secp256k1::new()))
    .push_opcode(opcodes::all::OP_PUSHNUM_1)
    .push_opcode(opcodes::all::OP_CHECKMULTISIG)
    .into_script();
  let sighash = SighashCache::new(&to_sign)
    .legacy_signature_hash(0, &redeem_script, EcdsaSighashType::All.to_u32())
    .unwrap();
  to_sign.input[0].script_sig = ScriptBuf::builder()
    .push_opcode(opcodes::OP_0)
    .push_slice(push_bytes(&ecdsa_signature(
      sighash.to_byte_array(),
      &attacker,
    )))
    .push_slice(push_bytes(redeem_script.as_bytes()))
    .into_script();

  assert!(matches!(
    verify_full(&victim, "foo", to_sign),
    Verification::Invalid(Error::ToSignInvalid)
  ));
}

#[test]
fn verify_p2sh_p2wpkh_rejects_mismatched_key() {
  let attacker = PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap();

  // The attacker's redeem script is not committed to by the victim's address.
  let victim = Address::from_str(P2SH_P2WSH_2OF2_ADDRESS)
    .unwrap()
    .assume_checked();
  let mut to_sign = crate::sign::sign_full(
    &victim,
    "foo",
    &[
      PrivateKey::from_wif(P2SH_P2WSH_2OF2_PRIVATE_KEY_1).unwrap(),
      PrivateKey::from_wif(P2SH_P2WSH_2OF2_PRIVATE_KEY_2).unwrap(),
    ],
    Some(&ScriptBuf::from_hex(P2SH_P2WSH_2OF2_WITNESS_SCRIPT).unwrap()),
    LockParams::default(),
  )
  .unwrap();
  assert_valid(verify_full(&victim, "foo", to_sign.clone()));

  to_sign.input[0].script_sig = push_only_script(&ScriptBuf::new_p2wpkh(
    &attacker
      .public_key(&Secp256k1::new())
      .wpubkey_hash()
      .unwrap(),
  ));
  to_sign.input[0].witness = p2wpkh_witness(&to_sign, &attacker);
  assert!(matches!(
    verify_full(&victim, "foo", to_sign),
    Verification::Invalid(Error::ToSignInvalid)
  ));

  // The victim's redeem script does not commit to the attacker's key.
  let victim = Address::from_str(NESTED_SEGWIT_ADDRESS)
    .unwrap()
    .assume_checked();
  let mut to_sign = crate::sign::sign_full(
    &victim,
    "foo",
    &[PrivateKey::from_wif(NESTED_SEGWIT_WIF_PRIVATE_KEY).unwrap()],
    None,
    LockParams::default(),
  )
  .unwrap();
  assert_valid(verify_full(&victim, "foo", to_sign.clone()));

  to_sign.input[0].witness = p2wpkh_witness(&to_sign, &attacker);
  assert!(matches!(
    verify_full(&victim, "foo", to_sign),
    Verification::Invalid(Error::PublicKeyMismatch)
  ));
}

#[test]
fn verify_p2sh_p2wsh_rejects_tampered_script_sig() {
  let address = Address::from_str(P2SH_P2WSH_2OF2_ADDRESS)
    .unwrap()
    .assume_checked();

  let mut to_sign = crate::sign::sign_full(
    &address,
    P2SH_P2WSH_2OF2_MESSAGE,
    &[
      PrivateKey::from_wif(P2SH_P2WSH_2OF2_PRIVATE_KEY_1).unwrap(),
      PrivateKey::from_wif(P2SH_P2WSH_2OF2_PRIVATE_KEY_2).unwrap(),
    ],
    Some(&ScriptBuf::from_hex(P2SH_P2WSH_2OF2_WITNESS_SCRIPT).unwrap()),
    LockParams::default(),
  )
  .unwrap();

  to_sign.input[0].script_sig = ScriptBuf::from_hex("deadbeef").unwrap();

  // Without a redeem script push, the spend is bare P2SH, which takes no
  // witness.
  assert!(matches!(
    crate::verify::verify_full(&address, P2SH_P2WSH_2OF2_MESSAGE, to_sign),
    Verification::Invalid(Error::InvalidWitness)
  ));
}

#[test]
fn sign_p2sh_rejects_mismatched_witness_script() {
  assert!(matches!(
    crate::sign::sign_full_encoded(
      P2SH_P2WSH_2OF2_ADDRESS,
      "foo",
      &[P2SH_P2WSH_2OF2_PRIVATE_KEY_1, P2SH_P2WSH_2OF2_PRIVATE_KEY_2],
      Some(P2WSH_2OF2_WITNESS_SCRIPT),
      LockParams::default()
    ),
    Err(Error::WitnessScriptMismatch)
  ));
}

#[test]
fn codeseparator_in_p2sh_p2wsh_full_is_invalid() {
  let witness_script = ScriptBuf::builder()
    .push_opcode(opcodes::all::OP_CODESEPARATOR)
    .push_opcode(opcodes::all::OP_PUSHNUM_1)
    .into_script();

  let address = Address::p2shwsh(&witness_script, bitcoin::Network::Bitcoin);
  let p2wsh_program = ScriptBuf::new_p2wsh(&witness_script.wscript_hash());
  let to_spend = create_to_spend(&address, "msg");
  let mut psbt = create_to_sign(&to_spend, None, LockParams::default());

  let mut witness = Witness::new();
  witness.push(witness_script.as_bytes());
  psbt.inputs[0].final_script_witness = Some(witness);
  psbt.inputs[0].final_script_sig = Some(push_only_script(&p2wsh_program));

  assert!(matches!(
    crate::verify::verify_full(&address, "msg", psbt.extract_tx().unwrap()),
    Verification::Invalid(Error::CodeSeparator)
  ));
}

#[test]
fn verify_p2sh_multisig_rejects_non_minimal_push() {
  let address = Address::from_str(P2SH_MULTISIG_2OF2_ADDRESS)
    .unwrap()
    .assume_checked();

  let mut to_sign = crate::sign::sign_full(
    &address,
    "foo",
    &[
      PrivateKey::from_wif(P2SH_MULTISIG_2OF2_PRIVATE_KEY_1).unwrap(),
      PrivateKey::from_wif(P2SH_MULTISIG_2OF2_PRIVATE_KEY_2).unwrap(),
    ],
    Some(&ScriptBuf::from_hex(P2SH_MULTISIG_2OF2_REDEEM_SCRIPT).unwrap()),
    LockParams::default(),
  )
  .unwrap();

  assert!(matches!(
    verify_full(&address, "foo", to_sign.clone()),
    Verification::Valid { .. }
  ));

  let pushes: Vec<Vec<u8>> = to_sign.input[0]
    .script_sig
    .instructions()
    .map(|instruction| match instruction.unwrap() {
      Instruction::PushBytes(b) => b.as_bytes().to_vec(),
      other => panic!("expected a push, got {other:?}"),
    })
    .collect();

  let mut bytes = vec![opcodes::OP_0.to_u8()];
  for (index, push) in pushes.iter().enumerate().skip(1) {
    if index == 1 {
      bytes.push(opcodes::all::OP_PUSHDATA1.to_u8());
    }
    bytes.push(push.len() as u8);
    bytes.extend_from_slice(push);
  }

  to_sign.input[0].script_sig = ScriptBuf::from_bytes(bytes);

  assert!(matches!(
    crate::verify::verify_full(&address, "foo", to_sign),
    Verification::Invalid(Error::InvalidWitness)
  ));
}

#[test]
fn bare_p2sh_non_minimal_multisig_pubkey_push_is_invalid() {
  let secp = Secp256k1::new();
  let private_key = PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap();
  let multisig = non_minimal_one_of_one_multisig(&private_key.public_key(&secp));
  let address = Address::p2sh(&multisig, bitcoin::Network::Bitcoin).unwrap();
  let to_spend = create_to_spend(&address, "foo");
  let mut tx = create_to_sign(&to_spend, None, LockParams::default()).unsigned_tx;
  let sighash = SighashCache::new(&mut tx)
    .legacy_signature_hash(0, &multisig, EcdsaSighashType::All.to_u32())
    .unwrap();
  let signature = bitcoin::ecdsa::Signature {
    signature: secp.sign_ecdsa(
      &Message::from_digest(sighash.to_byte_array()),
      &private_key.inner,
    ),
    sighash_type: EcdsaSighashType::All,
  };
  tx.input[0].script_sig = ScriptBuf::builder()
    .push_opcode(opcodes::OP_0)
    .push_slice(push_bytes(&signature.to_vec()))
    .push_slice(push_bytes(multisig.as_bytes()))
    .into_script();

  let result = verify_full(&address, "foo", tx);
  assert!(
    matches!(result, Verification::Invalid(Error::InvalidWitness)),
    "got {result:?}"
  );
}

#[test]
fn p2sh_small_integer_push_can_satisfy_if_branch() {
  let redeem_script = ScriptBuf::builder()
    .push_opcode(opcodes::all::OP_IF)
    .push_opcode(opcodes::all::OP_PUSHNUM_1)
    .push_opcode(opcodes::all::OP_ELSE)
    .push_opcode(opcodes::OP_0)
    .push_opcode(opcodes::all::OP_ENDIF)
    .into_script();
  let address = Address::p2sh(&redeem_script, bitcoin::Network::Bitcoin).unwrap();
  let to_spend = create_to_spend(&address, "foo");
  let mut tx = create_to_sign(&to_spend, None, LockParams::default()).unsigned_tx;
  tx.input[0].script_sig = ScriptBuf::builder()
    .push_opcode(opcodes::all::OP_PUSHNUM_1)
    .push_slice(push_bytes(redeem_script.as_bytes()))
    .into_script();

  assert_valid(verify_full(&address, "foo", tx));
}

#[test]
fn p2sh_small_integer_pass_through_is_not_rejected() {
  let redeem_script = ScriptBuf::builder()
    .push_opcode(opcodes::all::OP_DROP)
    .push_opcode(opcodes::all::OP_PUSHNUM_1)
    .into_script();
  let address = Address::p2sh(&redeem_script, bitcoin::Network::Bitcoin).unwrap();
  let to_spend = create_to_spend(&address, "foo");

  for opcode in [
    opcodes::all::OP_PUSHNUM_NEG1,
    opcodes::all::OP_PUSHNUM_1,
    opcodes::all::OP_PUSHNUM_2,
    opcodes::all::OP_PUSHNUM_16,
  ] {
    let mut tx = create_to_sign(&to_spend, None, LockParams::default()).unsigned_tx;
    tx.input[0].script_sig = ScriptBuf::builder()
      .push_opcode(opcode)
      .push_slice(push_bytes(redeem_script.as_bytes()))
      .into_script();

    let result = verify_full(&address, "foo", tx);
    assert!(
      matches!(result, Verification::Inconclusive),
      "opcode {opcode:?}: {result:?}"
    );
  }
}

#[test]
fn create_bare_p2sh_sets_witness_utxo() {
  let address = Address::from_str(NESTED_SEGWIT_ADDRESS)
    .unwrap()
    .assume_checked();

  let psbt = create_bip322_psbt(&address, "foo", None, &[], LockParams::default()).unwrap();

  assert!(psbt.inputs[0].witness_utxo.is_some());
  assert!(psbt.inputs[0].non_witness_utxo.is_none());
}

#[test]
fn interpreter_p2sh_single_key_valid() {
  let secp = Secp256k1::new();
  let private_key = PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap();

  let redeem_script = ScriptBuf::builder()
    .push_key(&private_key.public_key(&secp))
    .push_opcode(opcodes::all::OP_CHECKSIG)
    .into_script();

  let address = Address::p2sh(&redeem_script, bitcoin::Network::Bitcoin).unwrap();

  let to_spend = create_to_spend(&address, "foo");
  let psbt = create_to_sign(&to_spend, None, LockParams::default());
  let mut tx = psbt.unsigned_tx;

  let sighash = SighashCache::new(tx.clone())
    .legacy_signature_hash(0, &redeem_script, EcdsaSighashType::All.to_u32())
    .unwrap();

  let signature = bitcoin::ecdsa::Signature {
    signature: secp.sign_ecdsa(
      &secp256k1::Message::from_digest_slice(sighash.as_ref()).unwrap(),
      &private_key.inner,
    ),
    sighash_type: EcdsaSighashType::All,
  };

  // scriptSig: <sig> <redeemScript>
  tx.input[0].script_sig = ScriptBuf::builder()
    .push_slice(push_bytes(&signature.to_vec()))
    .push_slice(push_bytes(redeem_script.as_bytes()))
    .into_script();

  assert!(matches!(
    verify_full(&address, "foo", tx),
    Verification::Valid {
      time: LockTime::ZERO,
      age: Sequence(0)
    }
  ));
}

#[test]
fn interpreter_p2sh_p2wsh_single_key_valid() {
  let secp = Secp256k1::new();
  let private_key = PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap();

  let witness_script = ScriptBuf::builder()
    .push_key(&private_key.public_key(&secp))
    .push_opcode(opcodes::all::OP_CHECKSIG)
    .into_script();

  let p2wsh_program = ScriptBuf::new_p2wsh(&witness_script.wscript_hash());
  let address = Address::p2sh(&p2wsh_program, bitcoin::Network::Bitcoin).unwrap();

  let to_spend = create_to_spend(&address, "foo");
  let psbt = create_to_sign(&to_spend, None, LockParams::default());
  let mut tx = psbt.unsigned_tx;

  let sighash = SighashCache::new(tx.clone())
    .p2wsh_signature_hash(0, &witness_script, Amount::ZERO, EcdsaSighashType::All)
    .unwrap();

  let signature = bitcoin::ecdsa::Signature {
    signature: secp.sign_ecdsa(
      &secp256k1::Message::from_digest_slice(sighash.as_ref()).unwrap(),
      &private_key.inner,
    ),
    sighash_type: EcdsaSighashType::All,
  };

  let mut witness = Witness::new();
  witness.push(signature.to_vec());
  witness.push(witness_script.as_bytes());
  tx.input[0].witness = witness;
  tx.input[0].script_sig = push_only_script(&p2wsh_program);

  assert!(matches!(
    verify_full(&address, "foo", tx),
    Verification::Valid {
      time: LockTime::ZERO,
      age: Sequence(0)
    }
  ));
}

#[test]
fn oversized_bare_p2sh_redeem_script_is_invalid() {
  let secp = Secp256k1::new();
  let private_key = PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap();
  let public_key = private_key.public_key(&secp);
  let mut builder = ScriptBuf::builder().push_opcode(opcodes::all::OP_PUSHNUM_1);
  for _ in 0..16 {
    builder = builder.push_slice(push_bytes(&public_key.to_bytes()));
  }
  let redeem = builder
    .push_opcode(opcodes::all::OP_PUSHNUM_16)
    .push_opcode(opcodes::all::OP_CHECKMULTISIG)
    .into_script();
  assert!(redeem.len() > 520);

  let script_pubkey = ScriptBuf::new_p2sh(&redeem.script_hash());
  let address = Address::from_script(&script_pubkey, bitcoin::Network::Bitcoin).unwrap();
  let to_spend = create_to_spend(&address, "foo");
  let mut tx = create_to_sign(&to_spend, None, LockParams::default()).unsigned_tx;
  let sighash = SighashCache::new(&mut tx)
    .legacy_signature_hash(0, &redeem, EcdsaSighashType::All.to_u32())
    .unwrap();
  let signature = bitcoin::ecdsa::Signature {
    signature: secp.sign_ecdsa(
      &Message::from_digest(sighash.to_byte_array()),
      &private_key.inner,
    ),
    sighash_type: EcdsaSighashType::All,
  };
  tx.input[0].script_sig = ScriptBuf::builder()
    .push_opcode(opcodes::OP_0)
    .push_slice(push_bytes(&signature.to_vec()))
    .push_slice(push_bytes(redeem.as_bytes()))
    .into_script();

  assert!(matches!(
    verify_full(&address, "foo", tx),
    Verification::Invalid(Error::InvalidWitness)
  ));
}

/// The data pushes of a push-only scriptSig.
fn script_sig_pushes(script_sig: &Script) -> Vec<Vec<u8>> {
  script_sig
    .instructions()
    .map(|instruction| match instruction.unwrap() {
      Instruction::PushBytes(bytes) => bytes.as_bytes().to_vec(),
      other => panic!("expected a push, got {other:?}"),
    })
    .collect()
}

#[test]
fn bare_p2sh_multisig_requires_null_dummy_and_sighash_all() {
  let address = Address::from_str(P2SH_MULTISIG_2OF2_ADDRESS)
    .unwrap()
    .assume_checked();
  let to_sign = crate::sign::sign_full(
    &address,
    "foo",
    &[
      PrivateKey::from_wif(P2SH_MULTISIG_2OF2_PRIVATE_KEY_1).unwrap(),
      PrivateKey::from_wif(P2SH_MULTISIG_2OF2_PRIVATE_KEY_2).unwrap(),
    ],
    Some(&ScriptBuf::from_hex(P2SH_MULTISIG_2OF2_REDEEM_SCRIPT).unwrap()),
    LockParams::default(),
  )
  .unwrap();
  assert_valid(verify_full(&address, "foo", to_sign.clone()));

  // `OP_0 <sig_1> <sig_2> <redeem script>`
  let pushes = script_sig_pushes(&to_sign.input[0].script_sig);
  assert!(pushes[0].is_empty());

  // NULLDUMMY: the element CHECKMULTISIG pops beyond the signatures must be
  // empty.
  let mut non_null_dummy = to_sign.clone();
  non_null_dummy.input[0].script_sig = pushes[1..]
    .iter()
    .fold(
      ScriptBuf::builder().push_opcode(opcodes::all::OP_PUSHNUM_1),
      |builder, push| builder.push_slice(push_bytes(push)),
    )
    .into_script();
  assert!(matches!(
    verify_full(&address, "foo", non_null_dummy),
    Verification::Invalid(Error::InvalidWitness)
  ));

  let mut sighash_none = to_sign;
  let mut pushes = pushes;
  *pushes[1].last_mut().unwrap() = EcdsaSighashType::None as u8;
  sighash_none.input[0].script_sig = pushes
    .iter()
    .fold(ScriptBuf::builder(), |builder, push| {
      builder.push_slice(push_bytes(push))
    })
    .into_script();
  assert!(matches!(
    verify_full(&address, "foo", sighash_none),
    Verification::Invalid(Error::SigHashTypeUnsupported { .. })
  ));
}

#[test]
fn producers_reject_oversized_redeem_scripts() {
  // A 1-of-16 multisig of compressed keys is 547 bytes, more than any push
  // can carry, so no scriptSig can reveal it.
  let private_key = PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap();
  let public_key = private_key.public_key(&Secp256k1::new());
  let redeem = (0..16)
    .fold(
      ScriptBuf::builder().push_opcode(opcodes::all::OP_PUSHNUM_1),
      |builder, _| builder.push_key(&public_key),
    )
    .push_opcode(opcodes::all::OP_PUSHNUM_16)
    .push_opcode(opcodes::all::OP_CHECKMULTISIG)
    .into_script();
  assert!(redeem.len() > MAX_SCRIPT_ELEMENT_SIZE);
  let address = Address::from_script(
    &ScriptBuf::new_p2sh(&redeem.script_hash()),
    bitcoin::Network::Bitcoin,
  )
  .unwrap();

  assert!(matches!(
    crate::sign::sign_full(
      &address,
      "foo",
      &[private_key],
      Some(&redeem),
      LockParams::default()
    ),
    Err(Error::InvalidWitness)
  ));
  assert!(matches!(
    create_bip322_psbt(&address, "foo", Some(&redeem), &[], LockParams::default()),
    Err(Error::InvalidWitness)
  ));

  // A coordinator supplying the script anyway gets neither a signature nor a
  // finalized proof.
  let mut psbt = create_bip322_psbt(&address, "foo", None, &[], LockParams::default()).unwrap();
  psbt.inputs[0].redeem_script = Some(redeem);
  psbt.inputs[0].non_witness_utxo = Some(create_to_spend(&address, "foo"));
  assert!(matches!(
    sign_bip322_psbt_input(&mut psbt.clone(), &private_key, 0),
    Err(Error::InvalidWitness)
  ));
  assert!(matches!(
    finalize_bip322_psbt(psbt),
    Err(Error::InvalidWitness)
  ));
}
