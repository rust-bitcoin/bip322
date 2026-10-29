use super::fixtures::*;
use super::*;
use pretty_assertions::assert_eq;

#[test]
fn signature_decode_error() {
  assert_eq!(
    match crate::verify::verify_simple_encoded(
      TAPROOT_ADDRESS,
      "Hello World",
      "invalid signature not in base64 encoding"
    ) {
      Verification::Invalid(error) => error.to_string(),
      other => panic!("got {other:?}"),
    },
    "Decode error for signature `invalid signature not in base64 encoding`"
  );

  assert_eq!(
    match crate::verify::verify_simple_encoded(
      TAPROOT_ADDRESS,
      "Hello World",
      "smpAkcwRAIgM2gBAQqvZX15ZiysmKmQpDrG83avLIT492QBzLnQIxYCIBaTpOaD20qRlEylyxFSeEA2ba9YOixpX8z46TSDtS40ASECx/EgAxlkQpQ9hYjgGu6EBCPMVPwVIVJqO4XCsMvViH"
    ) {
      Verification::Invalid(error) => error.to_string(),
      other => panic!("got {other:?}"),
    },
    "Decode error for signature `AkcwRAIgM2gBAQqvZX15ZiysmKmQpDrG83avLIT492QBzLnQIxYCIBaTpOaD20qRlEylyxFSeEA2ba9YOixpX8z46TSDtS40ASECx/EgAxlkQpQ9hYjgGu6EBCPMVPwVIVJqO4XCsMvViH`"
  )
}

#[test]
fn roundtrip_legacy() {
  assert!(crate::verify::verify_legacy_encoded(
    LEGACY_ADDRESS,
    "Hello World",
    &crate::sign::sign_legacy_encoded(LEGACY_ADDRESS, "Hello World", WIF_PRIVATE_KEY).unwrap()
  )
  .is_ok(),);
}

#[test]
fn roundtrip_legacy_typed() {
  let address = Address::from_str(LEGACY_ADDRESS).unwrap().assume_checked();
  let private_key = PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap();

  let signature = crate::sign::sign_legacy(&address, "foo", &private_key).unwrap();

  assert!(crate::verify::verify_legacy(&address, "foo", signature).is_ok());
}

#[test]
fn legacy_address_rejects_simple_proof() {
  assert!(matches!(
    crate::verify::verify_simple_encoded(
      LEGACY_ADDRESS,
      "",
      "AkcwRAIgM2gBAQqvZX15ZiysmKmQpDrG83avLIT492QBzLnQIxYCIBaTpOaD20qRlEylyxFSeEA2ba9YOixpX8z46TSDtS40ASECx/EgAxlkQpQ9hYjgGu6EBCPMVPwVIVJqO4XCsMvViHI="
    ),
    Verification::Invalid(Error::InvalidWitness)
  ));
}

#[test]
fn legacy_and_v0_opcode_limit_is_enforced() {
  let script_with_ops = |non_push_ops| {
    let mut builder = ScriptBuf::builder().push_opcode(opcodes::all::OP_PUSHNUM_1);
    for _ in 0..non_push_ops {
      builder = builder.push_opcode(opcodes::all::OP_0NOTEQUAL);
    }
    builder.into_script()
  };

  for (non_push_ops, valid) in [(200, true), (202, false)] {
    let script = script_with_ops(non_push_ops);
    let p2wsh = Address::p2wsh(&script, bitcoin::Network::Bitcoin);
    let to_spend = create_to_spend(&p2wsh, "foo");
    let mut tx = create_to_sign(&to_spend, None, LockParams::default()).unsigned_tx;
    tx.input[0].witness = Witness::from_slice(&[script.as_bytes().to_vec()]);
    let result = verify_full(&p2wsh, "foo", tx);
    assert_eq!(
      result.is_valid(),
      valid,
      "P2WSH with {non_push_ops} ops: {result:?}"
    );
    if !valid {
      assert!(matches!(
        result,
        Verification::Invalid(Error::InvalidWitness)
      ));
    }

    let p2sh = Address::p2sh(&script, bitcoin::Network::Bitcoin).unwrap();
    let to_spend = create_to_spend(&p2sh, "foo");
    let mut tx = create_to_sign(&to_spend, None, LockParams::default()).unsigned_tx;
    tx.input[0].script_sig = push_only_script(&script);
    let result = verify_full(&p2sh, "foo", tx);
    assert_eq!(
      result.is_valid(),
      valid,
      "P2SH with {non_push_ops} ops: {result:?}"
    );
    if !valid {
      assert!(matches!(
        result,
        Verification::Invalid(Error::InvalidWitness)
      ));
    }
  }
}

#[test]
fn legacy_and_nested_spends_enforce_consensus_structure() {
  let legacy_address = Address::from_str(P2SH_MULTISIG_2OF2_ADDRESS)
    .unwrap()
    .assume_checked();
  let mut legacy = crate::sign::sign_full(
    &legacy_address,
    "foo",
    &[
      PrivateKey::from_wif(P2SH_MULTISIG_2OF2_PRIVATE_KEY_1).unwrap(),
      PrivateKey::from_wif(P2SH_MULTISIG_2OF2_PRIVATE_KEY_2).unwrap(),
    ],
    Some(&ScriptBuf::from_hex(P2SH_MULTISIG_2OF2_REDEEM_SCRIPT).unwrap()),
    LockParams::default(),
  )
  .unwrap();
  legacy.input[0].witness.push([1]);
  assert!(matches!(
    verify_full(&legacy_address, "foo", legacy),
    Verification::Invalid(Error::InvalidWitness)
  ));

  let nested_address = Address::from_str(NESTED_SEGWIT_ADDRESS)
    .unwrap()
    .assume_checked();
  let mut nested = crate::sign::sign_full(
    &nested_address,
    "foo",
    &[PrivateKey::from_wif(NESTED_SEGWIT_WIF_PRIVATE_KEY).unwrap()],
    None,
    LockParams::default(),
  )
  .unwrap();
  nested.input[0].script_sig = ScriptBuf::new();
  assert!(matches!(
    verify_full(&nested_address, "foo", nested),
    Verification::Invalid(Error::ToSignInvalid)
  ));
}
