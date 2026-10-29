use super::fixtures::*;
use super::*;

#[test]
fn interpreter_inexpressible_script_is_inconclusive() {
  // A bare hashlock without miniscript's OP_SIZE 32 OP_EQUALVERIFY prefix
  // is not an expressible fragment, so the interpreter cannot parse it.
  let witness_script = ScriptBuf::builder()
    .push_opcode(opcodes::all::OP_SHA256)
    .push_slice(sha256::Hash::hash(&[7u8; 32]).to_byte_array())
    .push_opcode(opcodes::all::OP_EQUAL)
    .into_script();

  let address = Address::p2wsh(&witness_script, bitcoin::Network::Bitcoin);

  let to_spend = create_to_spend(&address, "msg");
  let mut psbt = create_to_sign(&to_spend, None, LockParams::default());

  let mut witness = Witness::new();
  witness.push::<&[u8]>(&[]);
  witness.push([7u8; 32]);
  witness.push(witness_script.as_bytes());
  psbt.inputs[0].final_script_witness = Some(witness);

  assert!(matches!(
    verify_full(&address, "msg", psbt.extract_tx().unwrap()),
    Verification::Inconclusive
  ));
}

#[test]
fn interpreter_p2wsh_single_key_valid() {
  let secp = Secp256k1::new();
  let private_key = PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap();
  let pub_key = private_key.public_key(&secp);

  let witness_script = ScriptBuf::builder()
    .push_key(&pub_key)
    .push_opcode(opcodes::all::OP_CHECKSIG)
    .into_script();

  let (address, mut tx, signature) = p2wsh_interpreter_spend(
    &witness_script,
    &private_key,
    EcdsaSighashType::All,
    LockParams::default(),
  );

  let mut witness = Witness::new();
  witness.push(signature.to_vec());
  witness.push(witness_script.as_bytes());
  tx.input[0].witness = witness;

  assert!(matches!(
    verify_full(&address, "foo", tx),
    Verification::Valid {
      time: LockTime::ZERO,
      age: Sequence(0)
    }
  ));
}

#[test]
fn interpreter_p2wsh_unsatisfied_rejected() {
  let secp = Secp256k1::new();
  // the script names private_key; wrong_key signs, so the spend is well-formed but unsatisfied
  let private_key = PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap();
  let wrong_key = PrivateKey::from_wif(NESTED_SEGWIT_WIF_PRIVATE_KEY).unwrap();

  let pub_key = private_key.public_key(&secp);

  let witness_script = ScriptBuf::builder()
    .push_key(&pub_key)
    .push_opcode(opcodes::all::OP_CHECKSIG)
    .into_script();

  let (address, mut tx, signature) = p2wsh_interpreter_spend(
    &witness_script,
    &wrong_key,
    EcdsaSighashType::All,
    LockParams::default(),
  );

  let mut witness = Witness::new();
  witness.push(signature.to_vec());
  witness.push(witness_script.as_bytes());
  tx.input[0].witness = witness;

  let result = verify_full(&address, "foo", tx);

  assert!(
    matches!(
      result,
      Verification::Invalid(Error::SignatureInvalid { .. })
    ),
    "got {result:?}"
  );
}

#[test]
fn interpreter_p2wsh_hashlock_valid() {
  use bitcoin::hashes::sha256;

  let preimage = [7u8; 32];

  let witness_script = ScriptBuf::builder()
    .push_opcode(opcodes::all::OP_SIZE)
    .push_int(32)
    .push_opcode(opcodes::all::OP_EQUALVERIFY)
    .push_opcode(opcodes::all::OP_SHA256)
    .push_slice(sha256::Hash::hash(&preimage).to_byte_array())
    .push_opcode(opcodes::all::OP_EQUAL)
    .into_script();

  let address = Address::p2wsh(&witness_script, bitcoin::Network::Bitcoin);

  // no signature, so this builds the spend directly rather than via p2wsh_interpreter_spend
  let to_spend = create_to_spend(&address, "foo");
  let mut psbt = create_to_sign(&to_spend, None, LockParams::default());

  let mut witness = Witness::new();
  witness.push(preimage);
  witness.push(witness_script.as_bytes());
  psbt.inputs[0].final_script_witness = Some(witness);

  assert!(matches!(
    verify_full(&address, "foo", psbt.extract_tx().unwrap()),
    Verification::Valid {
      time: LockTime::ZERO,
      age: Sequence(0)
    }
  ));
}

#[test]
fn interpreter_rejects_non_sighash_all() {
  let secp = Secp256k1::new();
  let private_key = PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap();

  let witness_script = ScriptBuf::builder()
    .push_key(&private_key.public_key(&secp))
    .push_opcode(opcodes::all::OP_CHECKSIG)
    .into_script();

  let (address, mut tx, signature) = p2wsh_interpreter_spend(
    &witness_script,
    &private_key,
    EcdsaSighashType::None,
    LockParams::default(),
  );

  let mut witness = Witness::new();
  witness.push(signature.to_vec());
  witness.push(witness_script.as_bytes());
  tx.input[0].witness = witness;

  assert!(matches!(
    verify_full(&address, "foo", tx),
    Verification::Invalid(Error::SigHashTypeUnsupported { .. })
  ));
}

#[test]
fn interpreter_rejects_high_s() {
  let secp = Secp256k1::new();
  let private_key = PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap();

  let witness_script = ScriptBuf::builder()
    .push_key(&private_key.public_key(&secp))
    .push_opcode(opcodes::all::OP_CHECKSIG)
    .into_script();

  let (address, mut tx, signature) = p2wsh_interpreter_spend(
    &witness_script,
    &private_key,
    EcdsaSighashType::All,
    LockParams::default(),
  );

  assert!(require_low_s(&signature.signature).is_ok());

  // s' = CURVE_ORDER - s, big-endian with borrow propagation
  let mut compact = signature.signature.serialize_compact();
  let mut borrow = 0i16;
  for i in (0..32).rev() {
    let diff = secp256k1::constants::CURVE_ORDER[i] as i16 - compact[32 + i] as i16 - borrow;
    compact[32 + i] = diff.rem_euclid(256) as u8;
    borrow = i16::from(diff < 0);
  }

  let high_s = secp256k1::ecdsa::Signature::from_compact(&compact).unwrap();
  assert!(require_low_s(&high_s).is_err());

  let mut der = high_s.serialize_der().to_vec();
  der.push(EcdsaSighashType::All as u8);

  let mut witness = Witness::new();
  witness.push(der);
  witness.push(witness_script.as_bytes());
  tx.input[0].witness = witness;

  assert!(matches!(
    verify_full(&address, "foo", tx),
    Verification::Invalid(Error::SignatureInvalid { .. })
  ));
}

#[test]
fn interpreter_cltv_satisfied_valid() {
  let secp = Secp256k1::new();
  let private_key = PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap();

  // Let miniscript emit the script so the interpreter is guaranteed to
  // parse it: hand-assembling the v: wrapper around after() is fiddly.
  let witness_script = format!("and_v(v:after(100),pk({}))", private_key.public_key(&secp))
    .parse::<miniscript::Miniscript<bitcoin::PublicKey, miniscript::Segwitv0>>()
    .unwrap()
    .encode();

  let locks = LockParams {
    lock_time: LockTime::from_height(100).unwrap(),
    sequence: Sequence(0),
  };

  let (address, mut tx, signature) =
    p2wsh_interpreter_spend(&witness_script, &private_key, EcdsaSighashType::All, locks);

  let mut witness = Witness::new();
  witness.push(signature.to_vec());
  witness.push(witness_script.as_bytes());
  tx.input[0].witness = witness;

  assert!(matches!(
    verify_full(&address, "foo", tx),
    Verification::Valid { time, age }
      if time == LockTime::from_height(100).unwrap() && age == Sequence(0)
  ));
}

#[test]
fn interpreter_cltv_unsatisfied_rejected() {
  let secp = Secp256k1::new();
  let private_key = PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap();

  let witness_script = format!("and_v(v:after(100),pk({}))", private_key.public_key(&secp))
    .parse::<miniscript::Miniscript<bitcoin::PublicKey, miniscript::Segwitv0>>()
    .unwrap()
    .encode();

  // the script requires height 100; to_sign is locked to 50
  let locks = LockParams {
    lock_time: LockTime::from_height(50).unwrap(),
    sequence: Sequence(0),
  };

  let (address, mut tx, signature) =
    p2wsh_interpreter_spend(&witness_script, &private_key, EcdsaSighashType::All, locks);

  let mut witness = Witness::new();
  witness.push(signature.to_vec());
  witness.push(witness_script.as_bytes());
  tx.input[0].witness = witness;

  assert!(matches!(
    verify_full(&address, "foo", tx),
    Verification::Invalid(Error::ScriptNotSatisfied)
  ));
}

#[test]
fn interpreter_csv_satisfied_valid() {
  let secp = Secp256k1::new();
  let private_key = PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap();

  let witness_script = format!("and_v(v:pk({}),older(10))", private_key.public_key(&secp))
    .parse::<miniscript::Miniscript<bitcoin::PublicKey, miniscript::Segwitv0>>()
    .unwrap()
    .encode();

  let locks = LockParams {
    lock_time: LockTime::ZERO,
    sequence: Sequence(10),
  };

  let (address, mut tx, signature) =
    p2wsh_interpreter_spend(&witness_script, &private_key, EcdsaSighashType::All, locks);

  let mut witness = Witness::new();
  witness.push(signature.to_vec());
  witness.push(witness_script.as_bytes());
  tx.input[0].witness = witness;

  assert!(matches!(
    verify_full(&address, "foo", tx),
    Verification::Valid {
      time: LockTime::ZERO,
      age: Sequence(10)
    }
  ));
}

#[test]
fn interpreter_csv_unsatisfied_rejected() {
  let secp = Secp256k1::new();
  let private_key = PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap();

  let witness_script = format!("and_v(v:pk({}),older(10))", private_key.public_key(&secp))
    .parse::<miniscript::Miniscript<bitcoin::PublicKey, miniscript::Segwitv0>>()
    .unwrap()
    .encode();

  // the script requires a relative age of 10; to_sign's input is 5
  let locks = LockParams {
    lock_time: LockTime::ZERO,
    sequence: Sequence(5),
  };

  let (address, mut tx, signature) =
    p2wsh_interpreter_spend(&witness_script, &private_key, EcdsaSighashType::All, locks);

  let mut witness = Witness::new();
  witness.push(signature.to_vec());
  witness.push(witness_script.as_bytes());
  tx.input[0].witness = witness;

  assert!(matches!(
    verify_full(&address, "foo", tx),
    Verification::Invalid(Error::ScriptNotSatisfied)
  ));
}

#[test]
fn interpreter_p2tr_script_path_valid() {
  let private_key = PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap();
  let tapscript = single_key_tapscript(&private_key);

  let (address, mut tx, signature, control_block) =
    p2tr_script_path_spend(&tapscript, &private_key, TapSighashType::Default);

  let mut witness = Witness::new();
  witness.push(signature.to_vec());
  witness.push(tapscript.as_bytes());
  witness.push(control_block);
  tx.input[0].witness = witness;

  assert!(matches!(
    verify_full(&address, "foo", tx),
    Verification::Valid {
      time: LockTime::ZERO,
      age: Sequence(0)
    }
  ));
}

#[test]
fn interpreter_p2tr_script_path_tampered_rejected() {
  // the script names private_key; wrong_key signs, so the spend is
  // well-formed but the signature does not verify
  let private_key = PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap();
  let wrong_key = PrivateKey::from_wif(NESTED_SEGWIT_WIF_PRIVATE_KEY).unwrap();

  let tapscript = single_key_tapscript(&private_key);

  let (address, mut tx, signature, control_block) =
    p2tr_script_path_spend(&tapscript, &wrong_key, TapSighashType::Default);

  let mut witness = Witness::new();
  witness.push(signature.to_vec());
  witness.push(tapscript.as_bytes());
  witness.push(control_block);
  tx.input[0].witness = witness;

  let result = verify_full(&address, "foo", tx);

  assert!(
    matches!(
      result,
      Verification::Invalid(Error::SignatureInvalid { .. })
    ),
    "got {result:?}"
  );
}

#[test]
fn interpreter_p2tr_inexpressible_tapscript_inconclusive() {
  use bitcoin::hashes::sha256;

  // A bare hashlock without miniscript's OP_SIZE 32 OP_EQUALVERIFY prefix
  // is not an expressible fragment, so the interpreter cannot parse it.
  let tapscript = ScriptBuf::builder()
    .push_opcode(opcodes::all::OP_SHA256)
    .push_slice(sha256::Hash::hash(&[7u8; 32]).to_byte_array())
    .push_opcode(opcodes::all::OP_EQUAL)
    .into_script();

  let private_key = PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap();

  // no signature is needed: the script fails to parse before any sig check
  let (address, mut tx, _signature, control_block) =
    p2tr_script_path_spend(&tapscript, &private_key, TapSighashType::Default);

  let mut witness = Witness::new();
  witness.push([7u8; 32]);
  witness.push(tapscript.as_bytes());
  witness.push(control_block);
  tx.input[0].witness = witness;

  assert!(matches!(
    verify_full(&address, "foo", tx),
    Verification::Inconclusive
  ));
}
