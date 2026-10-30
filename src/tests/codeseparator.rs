use super::fixtures::*;
use super::*;

#[test]
fn codeseparator_spend_is_invalid() {
  // Required rule: CODESEPARATOR is forbidden, so a proof using it must
  // verify invalid — not inconclusive, even though neither the templates
  // nor the interpreter can evaluate such scripts.
  let codeseparator_script = ScriptBuf::builder()
    .push_opcode(opcodes::all::OP_CODESEPARATOR)
    .push_opcode(opcodes::all::OP_PUSHNUM_1)
    .into_script();

  // P2WSH witness script.
  let address = Address::p2wsh(&codeseparator_script, bitcoin::Network::Bitcoin);

  let to_spend = create_to_spend(&address, "msg");
  let mut psbt = create_to_sign(&to_spend, None, LockParams::default());

  let mut witness = Witness::new();
  witness.push(codeseparator_script.as_bytes());
  psbt.inputs[0].final_script_witness = Some(witness);

  let to_sign = psbt.extract_tx().unwrap();

  assert!(matches!(
    verify_full(&address, "msg", to_sign.clone()),
    Verification::Invalid(Error::CodeSeparator)
  ));

  // Required rules take precedence over the upgradeable version rule.
  let mut unknown_version = to_sign;
  unknown_version.version = Version(3);
  assert!(matches!(
    verify_full(&address, "msg", unknown_version),
    Verification::Invalid(Error::CodeSeparator)
  ));

  // P2SH redeem script.
  let address = Address::p2sh(&codeseparator_script, bitcoin::Network::Bitcoin).unwrap();

  let to_spend = create_to_spend(&address, "msg");
  let mut to_sign = create_to_sign(&to_spend, None, LockParams::default())
    .extract_tx()
    .unwrap();

  to_sign.input[0].script_sig = ScriptBuf::builder()
    .push_slice(push_bytes(codeseparator_script.as_bytes()))
    .into_script();

  assert!(matches!(
    verify_full(&address, "msg", to_sign),
    Verification::Invalid(Error::CodeSeparator)
  ));

  // P2TR script-path tapscript.
  let secp = Secp256k1::new();
  let internal_key = PrivateKey::from_wif(WIF_PRIVATE_KEY)
    .unwrap()
    .public_key(&secp)
    .inner
    .x_only_public_key()
    .0;

  let spend_info = bitcoin::taproot::TaprootBuilder::new()
    .add_leaf(0, codeseparator_script.clone())
    .unwrap()
    .finalize(&secp, internal_key)
    .unwrap();

  let address = Address::p2tr(
    &secp,
    internal_key,
    spend_info.merkle_root(),
    bitcoin::Network::Bitcoin,
  );

  let control_block = spend_info
    .control_block(&(
      codeseparator_script.clone(),
      bitcoin::taproot::LeafVersion::TapScript,
    ))
    .unwrap();

  let to_spend = create_to_spend(&address, "msg");
  let mut to_sign = create_to_sign(&to_spend, None, LockParams::default())
    .extract_tx()
    .unwrap();

  let mut witness = Witness::new();
  witness.push(codeseparator_script.as_bytes());
  witness.push(control_block.serialize());
  to_sign.input[0].witness = witness;

  assert!(matches!(
    verify_full(&address, "msg", to_sign.clone()),
    Verification::Invalid(Error::CodeSeparator)
  ));

  // An annex does not hide the tapscript from the required-rule scan.
  to_sign.input[0].witness.push([0x50]);
  assert!(matches!(
    verify_full(&address, "msg", to_sign),
    Verification::Invalid(Error::CodeSeparator)
  ));
}

#[test]
fn codeseparator_in_script_sig_is_invalid() {
  let address = Address::from_str(LEGACY_ADDRESS).unwrap().assume_checked();
  let mut to_sign = crate::sign::sign_full(
    &address,
    "foo",
    &[PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap()],
    None,
    LockParams::default(),
  )
  .unwrap();
  assert_valid(verify_full(&address, "foo", to_sign.clone()));

  let mut script_sig = vec![opcodes::all::OP_CODESEPARATOR.to_u8()];
  script_sig.extend_from_slice(to_sign.input[0].script_sig.as_bytes());
  to_sign.input[0].script_sig = ScriptBuf::from_bytes(script_sig);

  assert!(matches!(
    verify_full(&address, "foo", to_sign),
    Verification::Invalid(Error::CodeSeparator)
  ));
}

#[test]
fn codeseparator_byte_in_pushed_data_is_not_an_opcode() {
  // 0xab inside pushed data is data, not OP_CODESEPARATOR, and must not
  // trip the required rule. This bare hashlock is still inexpressible in
  // miniscript, so the outcome stays inconclusive.
  let witness_script = ScriptBuf::builder()
    .push_opcode(opcodes::all::OP_SHA256)
    .push_slice([0xab; 32])
    .push_opcode(opcodes::all::OP_EQUAL)
    .into_script();

  let address = Address::p2wsh(&witness_script, bitcoin::Network::Bitcoin);

  let to_spend = create_to_spend(&address, "msg");
  let mut psbt = create_to_sign(&to_spend, None, LockParams::default());

  let mut witness = Witness::new();
  witness.push::<&[u8]>(&[]);
  witness.push(witness_script.as_bytes());
  psbt.inputs[0].final_script_witness = Some(witness);

  assert!(matches!(
    verify_full(&address, "msg", psbt.extract_tx().unwrap()),
    Verification::Inconclusive
  ));
}
