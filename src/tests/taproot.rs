use super::fixtures::*;
use super::*;

#[test]
fn empty_tapscript_uses_bip342_stack_semantics() {
  let secp = Secp256k1::new();
  let internal_key = PrivateKey::from_wif(NESTED_SEGWIT_WIF_PRIVATE_KEY)
    .unwrap()
    .public_key(&secp)
    .inner
    .x_only_public_key()
    .0;
  let tapscript = ScriptBuf::new();
  let spend_info = bitcoin::taproot::TaprootBuilder::new()
    .add_leaf(0, tapscript.clone())
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
    .control_block(&(tapscript.clone(), bitcoin::taproot::LeafVersion::TapScript))
    .unwrap()
    .serialize();
  let to_spend = create_to_spend(&address, "foo");

  let mut valid = create_to_sign(&to_spend, None, LockParams::default()).unsigned_tx;
  valid.input[0].witness = Witness::from_slice(&[
    vec![1],
    tapscript.as_bytes().to_vec(),
    control_block.clone(),
  ]);
  assert_valid(verify_full(&address, "foo", valid));

  for false_element in [vec![0], vec![0x80]] {
    let mut false_stack = create_to_sign(&to_spend, None, LockParams::default()).unsigned_tx;
    false_stack.input[0].witness = Witness::from_slice(&[
      false_element,
      tapscript.as_bytes().to_vec(),
      control_block.clone(),
    ]);
    assert!(matches!(
      verify_full(&address, "foo", false_stack),
      Verification::Invalid(Error::ScriptNotSatisfied)
    ));
  }

  let mut annexed = create_to_sign(&to_spend, None, LockParams::default()).unsigned_tx;
  annexed.input[0].witness = Witness::from_slice(&[
    vec![1],
    tapscript.as_bytes().to_vec(),
    control_block,
    vec![0x50],
  ]);
  assert!(matches!(
    verify_full(&address, "foo", annexed),
    Verification::Inconclusive
  ));
}

#[test]
fn p2tr_explicit_default_sighash_is_invalid() {
  let address = Address::from_str(TAPROOT_ADDRESS).unwrap().assume_checked();
  let mut witness = crate::sign::sign_simple(
    &address,
    "foo",
    &[PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap()],
    None,
  )
  .unwrap()
  .to_vec();

  // The producer uses ALL. Re-sign as DEFAULT so only the forbidden explicit
  // 0x00 representation distinguishes this from a valid 64-byte signature.
  let to_spend = create_to_spend(&address, "foo");
  let psbt = create_to_sign(&to_spend, None, LockParams::default());
  let sighash = SighashCache::new(psbt.unsigned_tx)
    .taproot_key_spend_signature_hash(
      0,
      &sighash::Prevouts::All(&to_spend.output),
      TapSighashType::Default,
    )
    .unwrap();
  let secp = Secp256k1::new();
  let keypair =
    Keypair::from_secret_key(&secp, &PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap().inner)
      .tap_tweak(&secp, None)
      .to_keypair();
  let signature =
    secp.sign_schnorr_no_aux_rand(&Message::from_digest(sighash.to_byte_array()), &keypair);
  witness[0] = signature.as_ref().to_vec();
  witness[0].push(0);

  assert!(matches!(
    crate::verify::verify_simple(&address, "foo", Witness::from_slice(&witness)),
    Verification::Invalid(Error::SigHashTypeUnsupported { .. })
  ));
}

#[test]
fn p2tr_script_path_explicit_default_sighash_is_invalid() {
  let private_key = PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap();
  let tapscript = single_key_tapscript(&private_key);
  let (address, mut tx, signature, control_block) =
    p2tr_script_path_spend(&tapscript, &private_key, TapSighashType::Default);
  let mut encoded = signature.to_vec();
  encoded.push(0);
  tx.input[0].witness =
    Witness::from_slice(&[encoded, tapscript.as_bytes().to_vec(), control_block]);

  assert!(matches!(
    verify_full(&address, "foo", tx),
    Verification::Invalid(Error::SigHashTypeUnsupported { .. })
  ));
}

#[test]
fn p2tr_undecodable_control_block_is_invalid() {
  let private_key = PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap();
  let tapscript = single_key_tapscript(&private_key);
  let (address, mut tx, signature, mut control_block) =
    p2tr_script_path_spend(&tapscript, &private_key, TapSighashType::Default);
  control_block[1] ^= 1;
  tx.input[0].witness = Witness::from_slice(&[
    signature.to_vec(),
    tapscript.as_bytes().to_vec(),
    control_block,
  ]);

  assert!(matches!(
    verify_full(&address, "foo", tx),
    Verification::Invalid(Error::InvalidWitness)
  ));
}

#[test]
fn p2tr_control_block_parity_is_committed() {
  let private_key = PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap();
  let tapscript = single_key_tapscript(&private_key);
  let (address, mut tx, signature, mut control_block) =
    p2tr_script_path_spend(&tapscript, &private_key, TapSighashType::Default);
  tx.input[0].witness = Witness::from_slice(&[
    signature.to_vec(),
    tapscript.to_bytes(),
    control_block.clone(),
  ]);
  assert_valid(verify_full(&address, "foo", tx.clone()));

  control_block[0] ^= 1;
  tx.input[0].witness =
    Witness::from_slice(&[signature.to_vec(), tapscript.to_bytes(), control_block]);

  assert!(matches!(
    verify_full(&address, "foo", tx),
    Verification::Invalid(Error::ScriptNotSatisfied)
  ));
}

#[test]
fn p2tr_control_block_does_not_commit_to_attacker_tapscript() {
  let secp = Secp256k1::new();
  let victim_key = PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap();
  let victim_script = single_key_tapscript(&victim_key);
  let (address, mut tx, signature, control_block) =
    p2tr_script_path_spend(&victim_script, &victim_key, TapSighashType::Default);
  tx.input[0].witness = Witness::from_slice(&[
    signature.to_vec(),
    victim_script.to_bytes(),
    control_block.clone(),
  ]);
  assert_valid(verify_full(&address, "foo", tx.clone()));

  // The attacker validly signs their own leaf over the victim's to_sign, but
  // the victim's control block commits to a different leaf.
  let attacker_key = PrivateKey::from_wif(NESTED_SEGWIT_WIF_PRIVATE_KEY).unwrap();
  let attacker_script = single_key_tapscript(&attacker_key);
  let sighash = SighashCache::new(&tx)
    .taproot_script_spend_signature_hash(
      0,
      &sighash::Prevouts::All(&create_to_spend(&address, "foo").output),
      bitcoin::taproot::TapLeafHash::from_script(
        &attacker_script,
        bitcoin::taproot::LeafVersion::TapScript,
      ),
      TapSighashType::Default,
    )
    .unwrap();
  let signature = secp.sign_schnorr_no_aux_rand(
    &Message::from_digest(sighash.to_byte_array()),
    &Keypair::from_secret_key(&secp, &attacker_key.inner),
  );
  tx.input[0].witness = Witness::from_slice(&[
    signature.as_ref().to_vec(),
    attacker_script.to_bytes(),
    control_block,
  ]);

  assert!(matches!(
    verify_full(&address, "foo", tx),
    Verification::Invalid(Error::ScriptNotSatisfied)
  ));
}

#[test]
fn p2tr_annex_and_op_success_are_inconclusive() {
  let private_key = PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap();
  let address = Address::from_str(TAPROOT_ADDRESS).unwrap().assume_checked();
  let to_spend = create_to_spend(&address, "foo");
  let mut tx = create_to_sign(&to_spend, None, LockParams::default()).unsigned_tx;
  let annex = vec![0x50, 1, 2, 3];
  tx.input[0].witness = Witness::from_slice(&[Vec::new(), annex.clone()]);
  let sighash = SighashCache::new(&mut tx)
    .taproot_signature_hash(
      0,
      &sighash::Prevouts::All(&to_spend.output),
      Some(sighash::Annex::new(&annex).unwrap()),
      None,
      TapSighashType::Default,
    )
    .unwrap();
  let secp = Secp256k1::new();
  let keypair = Keypair::from_secret_key(&secp, &private_key.inner)
    .tap_tweak(&secp, None)
    .to_keypair();
  let signature =
    secp.sign_schnorr_no_aux_rand(&Message::from_digest(sighash.to_byte_array()), &keypair);
  tx.input[0].witness = Witness::from_slice(&[signature.as_ref().to_vec(), annex.clone()]);

  assert!(matches!(
    verify_full(&address, "foo", tx),
    Verification::Inconclusive
  ));

  let tapscript = single_key_tapscript(&private_key);
  let (address, mut tx, _signature, control_block) =
    p2tr_script_path_spend(&tapscript, &private_key, TapSighashType::Default);
  tx.input[0].witness = Witness::from_slice(&[
    Vec::new(),
    tapscript.as_bytes().to_vec(),
    control_block.clone(),
    annex.clone(),
  ]);
  let leaf_hash = bitcoin::taproot::TapLeafHash::from_script(
    &tapscript,
    bitcoin::taproot::LeafVersion::TapScript,
  );
  let script_to_spend = create_to_spend(&address, "foo");
  let sighash = SighashCache::new(&mut tx)
    .taproot_signature_hash(
      0,
      &sighash::Prevouts::All(&script_to_spend.output),
      Some(sighash::Annex::new(&annex).unwrap()),
      Some((leaf_hash, 0xffff_ffff)),
      TapSighashType::Default,
    )
    .unwrap();
  let signature = secp.sign_schnorr_no_aux_rand(
    &Message::from_digest(sighash.to_byte_array()),
    &Keypair::from_secret_key(&secp, &private_key.inner),
  );
  let mut encoded = signature.as_ref().to_vec();
  tx.input[0].witness = Witness::from_slice(&[
    encoded.clone(),
    tapscript.as_bytes().to_vec(),
    control_block.clone(),
    annex.clone(),
  ]);
  assert!(matches!(
    verify_full(&address, "foo", tx.clone()),
    Verification::Inconclusive
  ));

  encoded.push(0);
  tx.input[0].witness =
    Witness::from_slice(&[encoded, tapscript.as_bytes().to_vec(), control_block, annex]);
  assert!(matches!(
    verify_full(&address, "foo", tx),
    Verification::Invalid(Error::SigHashTypeUnsupported { .. })
  ));

  let success_script = ScriptBuf::from_bytes(vec![0x50]);
  let (success_address, mut tx, _signature, control_block) =
    p2tr_script_path_spend(&success_script, &private_key, TapSighashType::Default);
  tx.input[0].witness = Witness::from_slice(&[success_script.as_bytes().to_vec(), control_block]);
  assert!(matches!(
    verify_full(&success_address, "foo", tx),
    Verification::Inconclusive
  ));
}

#[test]
fn annex_non_template_tapscript_checks_required_sighash() {
  let private_key = PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap();
  let secp = Secp256k1::new();
  let tapscript = ScriptBuf::builder()
    .push_x_only_key(&private_key.public_key(&secp).inner.x_only_public_key().0)
    .push_opcode(opcodes::all::OP_CHECKSIGVERIFY)
    .push_opcode(opcodes::all::OP_PUSHNUM_1)
    .into_script();
  let (address, mut tx, _signature, control_block) =
    p2tr_script_path_spend(&tapscript, &private_key, TapSighashType::None);
  let annex = vec![0x50, 1, 2, 3];
  let to_spend = create_to_spend(&address, "foo");
  let leaf_hash = bitcoin::taproot::TapLeafHash::from_script(
    &tapscript,
    bitcoin::taproot::LeafVersion::TapScript,
  );
  let keypair = Keypair::from_secret_key(&secp, &private_key.inner);

  let sighash = SighashCache::new(tx.clone())
    .taproot_signature_hash(
      0,
      &sighash::Prevouts::All(&to_spend.output),
      Some(sighash::Annex::new(&annex).unwrap()),
      Some((leaf_hash, 0xffff_ffff)),
      TapSighashType::None,
    )
    .unwrap();
  let signature =
    secp.sign_schnorr_no_aux_rand(&Message::from_digest(sighash.to_byte_array()), &keypair);
  let mut encoded = signature.as_ref().to_vec();
  encoded.push(2);
  tx.input[0].witness = Witness::from_slice(&[
    encoded,
    tapscript.as_bytes().to_vec(),
    control_block.clone(),
    annex.clone(),
  ]);
  let result = verify_full(&address, "foo", tx.clone());
  assert!(
    matches!(
      result,
      Verification::Invalid(Error::SigHashTypeUnsupported { .. })
    ),
    "got {result:?}"
  );

  let sighash = SighashCache::new(tx.clone())
    .taproot_signature_hash(
      0,
      &sighash::Prevouts::All(&to_spend.output),
      Some(sighash::Annex::new(&annex).unwrap()),
      Some((leaf_hash, 0xffff_ffff)),
      TapSighashType::All,
    )
    .unwrap();
  let signature =
    secp.sign_schnorr_no_aux_rand(&Message::from_digest(sighash.to_byte_array()), &keypair);
  let mut encoded = signature.as_ref().to_vec();
  encoded.push(1);
  tx.input[0].witness = Witness::from_slice(&[
    encoded,
    tapscript.as_bytes().to_vec(),
    control_block.clone(),
    annex.clone(),
  ]);
  assert!(matches!(
    verify_full(&address, "foo", tx.clone()),
    Verification::Inconclusive
  ));

  // With the annex present the signature cannot be checked, so a bad
  // signature must stay inconclusive rather than becoming Invalid.
  let wrong_key = PrivateKey::from_wif(NESTED_SEGWIT_WIF_PRIVATE_KEY).unwrap();
  let wrong_keypair = Keypair::from_secret_key(&secp, &wrong_key.inner);
  let signature = secp.sign_schnorr_no_aux_rand(
    &Message::from_digest(sighash.to_byte_array()),
    &wrong_keypair,
  );
  let mut encoded = signature.as_ref().to_vec();
  encoded.push(1);
  tx.input[0].witness =
    Witness::from_slice(&[encoded, tapscript.as_bytes().to_vec(), control_block, annex]);
  assert!(matches!(
    verify_full(&address, "foo", tx),
    Verification::Inconclusive
  ));
}

#[test]
fn op_success_decode_order_is_preserved() {
  let private_key = PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap();
  let verdict = |bytes: Vec<u8>| {
    let tapscript = ScriptBuf::from_bytes(bytes);
    let (address, mut tx, _signature, control_block) =
      p2tr_script_path_spend(&tapscript, &private_key, TapSighashType::Default);
    tx.input[0].witness = Witness::from_slice(&[tapscript.as_bytes().to_vec(), control_block]);
    verify_full(&address, "foo", tx)
  };

  // A decoded OP_SUCCESSx takes precedence over a later truncated push.
  assert!(matches!(
    verdict(vec![0x50, 0x02, 0xaa]),
    Verification::Inconclusive
  ));
  // A truncated push before OP_SUCCESSx is a required decode failure.
  assert!(matches!(
    verdict(vec![0x03, 0xaa, 0x50]),
    Verification::Invalid(Error::InvalidWitness)
  ));
  // A non-minimal push before OP_SUCCESSx is also required-invalid.
  assert!(matches!(
    verdict(vec![0x4c, 0x01, 0x07, 0x50]),
    Verification::Invalid(Error::InvalidWitness)
  ));
}

#[test]
fn p2tr_unknown_leaf_version_naked_zero_is_inconclusive() {
  let tapscript = ScriptBuf::builder()
    .push_opcode(opcodes::OP_0)
    .push_opcode(opcodes::all::OP_CSV)
    .into_script();
  let leaf_version = bitcoin::taproot::LeafVersion::from_consensus(0xc2).unwrap();
  let secp = Secp256k1::new();
  let internal_key = PrivateKey::from_wif(NESTED_SEGWIT_WIF_PRIVATE_KEY)
    .unwrap()
    .public_key(&secp)
    .inner
    .x_only_public_key()
    .0;
  let spend_info = bitcoin::taproot::TaprootBuilder::new()
    .add_leaf_with_ver(0, tapscript.clone(), leaf_version)
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
    .control_block(&(tapscript.clone(), leaf_version))
    .unwrap();
  let output_key = XOnlyPublicKey::from_slice(&address.script_pubkey().as_bytes()[2..]).unwrap();
  assert!(control_block.verify_taproot_commitment(&secp, output_key, &tapscript));
  let control_block = control_block.serialize();
  let decoded = bitcoin::taproot::ControlBlock::decode(&control_block).unwrap();
  assert!(decoded.verify_taproot_commitment(&secp, output_key, &tapscript));
  let to_spend = create_to_spend(&address, "foo");
  let mut tx = create_to_sign(&to_spend, None, LockParams::default()).unsigned_tx;
  tx.input[0].witness = Witness::from_slice(&[tapscript.as_bytes().to_vec(), control_block]);

  let result = verify_full(&address, "foo", tx);
  assert!(
    matches!(result, Verification::Inconclusive),
    "got {result:?}"
  );
}

#[test]
fn p2tr_unknown_public_key_type_is_inconclusive() {
  let private_key = PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap();
  let tapscript = ScriptBuf::builder()
    .push_slice([7u8; 33])
    .push_opcode(opcodes::all::OP_CHECKSIG)
    .into_script();
  let (address, mut tx, _signature, control_block) =
    p2tr_script_path_spend(&tapscript, &private_key, TapSighashType::Default);
  tx.input[0].witness = Witness::from_slice(&[
    vec![1; 32],
    tapscript.as_bytes().to_vec(),
    control_block.clone(),
  ]);

  assert!(matches!(
    verify_full(&address, "foo", tx.clone()),
    Verification::Inconclusive
  ));

  tx.input[0].witness = Witness::from_slice(&[
    Vec::new(),
    tapscript.as_bytes().to_vec(),
    control_block.clone(),
  ]);
  assert!(matches!(
    verify_full(&address, "foo", tx.clone()),
    Verification::Invalid(Error::ScriptNotSatisfied)
  ));

  tx.input[0].witness = Witness::from_slice(&[tapscript.as_bytes().to_vec(), control_block]);
  assert!(matches!(
    verify_full(&address, "foo", tx),
    Verification::Invalid(Error::InvalidWitness)
  ));
}

#[test]
fn p2tr_non_template_unknown_public_key_type_is_inconclusive() {
  let private_key = PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap();
  let tapscript = ScriptBuf::builder()
    .push_slice([7u8; 33])
    .push_opcode(opcodes::all::OP_CHECKSIGVERIFY)
    .push_opcode(opcodes::all::OP_PUSHNUM_1)
    .into_script();
  let (address, mut tx, _signature, control_block) =
    p2tr_script_path_spend(&tapscript, &private_key, TapSighashType::Default);
  tx.input[0].witness =
    Witness::from_slice(&[vec![1; 64], tapscript.as_bytes().to_vec(), control_block]);

  let result = verify_full(&address, "foo", tx);
  assert!(
    matches!(result, Verification::Inconclusive),
    "got {result:?}"
  );
}

#[test]
fn p2tr_non_minimal_unknown_key_push_is_invalid() {
  let private_key = PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap();
  let mut script = vec![opcodes::all::OP_PUSHDATA1.to_u8(), 33];
  script.extend_from_slice(&[7; 33]);
  script.push(opcodes::all::OP_CHECKSIG.to_u8());
  let tapscript = ScriptBuf::from_bytes(script);
  let (address, mut tx, _signature, control_block) =
    p2tr_script_path_spend(&tapscript, &private_key, TapSighashType::Default);
  tx.input[0].witness =
    Witness::from_slice(&[vec![1; 32], tapscript.as_bytes().to_vec(), control_block]);

  assert!(matches!(
    verify_full(&address, "foo", tx.clone()),
    Verification::Invalid(Error::InvalidWitness)
  ));
  tx.input[0].witness.push([0x50]);
  assert!(matches!(
    verify_full(&address, "foo", tx),
    Verification::Invalid(Error::InvalidWitness)
  ));
}

#[test]
fn p2tr_malformed_known_key_and_empty_script_are_invalid() {
  let private_key = PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap();
  let tapscript = ScriptBuf::builder()
    .push_slice([0xff; 32])
    .push_opcode(opcodes::all::OP_CHECKSIG)
    .into_script();
  let (address, mut tx, _signature, control_block) =
    p2tr_script_path_spend(&tapscript, &private_key, TapSighashType::Default);
  tx.input[0].witness =
    Witness::from_slice(&[vec![1], tapscript.as_bytes().to_vec(), control_block]);
  assert!(matches!(
    verify_full(&address, "foo", tx),
    Verification::Invalid(Error::InvalidPublicKey)
  ));

  let tapscript = ScriptBuf::new();
  let (address, mut tx, _signature, control_block) =
    p2tr_script_path_spend(&tapscript, &private_key, TapSighashType::Default);
  tx.input[0].witness = Witness::from_slice(&[tapscript.as_bytes().to_vec(), control_block]);
  assert!(matches!(
    verify_full(&address, "foo", tx.clone()),
    Verification::Invalid(Error::ScriptNotSatisfied)
  ));
  tx.input[0].witness.push([0x50]);
  assert!(matches!(
    verify_full(&address, "foo", tx),
    Verification::Invalid(Error::ScriptNotSatisfied)
  ));
}

#[test]
fn p2tr_single_key_script_path_is_valid() {
  let private_key = PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap();
  let tapscript = single_key_tapscript(&private_key);

  let (address, mut tx, signature, control_block) =
    p2tr_script_path_spend(&tapscript, &private_key, TapSighashType::Default);

  tx.input[0].witness =
    Witness::from_slice(&[signature.to_vec(), tapscript.to_bytes(), control_block]);

  assert!(matches!(
    verify_full(&address, "foo", tx),
    Verification::Valid {
      time: LockTime::ZERO,
      age: Sequence(0)
    }
  ));
}

#[test]
fn p2tr_single_key_script_path_wrong_key_is_invalid() {
  // The script names private_key but wrong_key signs, so the spend is
  // well-formed but the signature does not verify.
  let private_key = PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap();
  let wrong_key = PrivateKey::from_wif(NESTED_SEGWIT_WIF_PRIVATE_KEY).unwrap();
  let tapscript = single_key_tapscript(&private_key);

  let (address, mut tx, signature, control_block) =
    p2tr_script_path_spend(&tapscript, &wrong_key, TapSighashType::Default);

  tx.input[0].witness =
    Witness::from_slice(&[signature.to_vec(), tapscript.to_bytes(), control_block]);

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
fn p2tr_inexpressible_tapscript_is_inconclusive() {
  // A bare hashlock without miniscript's OP_SIZE 32 OP_EQUALVERIFY prefix
  // is not an expressible fragment, so the interpreter cannot parse it.
  let tapscript = ScriptBuf::builder()
    .push_opcode(opcodes::all::OP_SHA256)
    .push_slice(sha256::Hash::hash(&[7u8; 32]).to_byte_array())
    .push_opcode(opcodes::all::OP_EQUAL)
    .into_script();

  let private_key = PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap();

  // No signature is needed: the script fails to parse before any check.
  let (address, mut tx, _signature, control_block) =
    p2tr_script_path_spend(&tapscript, &private_key, TapSighashType::Default);

  tx.input[0].witness = Witness::from_slice(&[vec![7; 32], tapscript.to_bytes(), control_block]);

  assert!(matches!(
    verify_full(&address, "foo", tx),
    Verification::Inconclusive
  ));
}

#[test]
fn p2tr_non_template_tapscript_is_interpreted() {
  // `<K> CHECKSIGVERIFY 1` matches no template, so the interpreter checks it.
  let private_key = PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap();
  let tapscript = ScriptBuf::builder()
    .push_x_only_key(
      &private_key
        .public_key(&Secp256k1::new())
        .inner
        .x_only_public_key()
        .0,
    )
    .push_opcode(opcodes::all::OP_CHECKSIGVERIFY)
    .push_opcode(opcodes::all::OP_PUSHNUM_1)
    .into_script();

  let verify = |signer: &PrivateKey, sighash_type: TapSighashType, explicit_default: bool| {
    let (address, mut tx, signature, control_block) =
      p2tr_script_path_spend(&tapscript, signer, sighash_type);
    let mut encoded = signature.to_vec();
    if explicit_default {
      encoded.push(TapSighashType::Default as u8);
    }
    tx.input[0].witness = Witness::from_slice(&[encoded, tapscript.to_bytes(), control_block]);
    verify_full(&address, "foo", tx)
  };

  assert_valid(verify(&private_key, TapSighashType::Default, false));

  let result = verify(
    &PrivateKey::from_wif(NESTED_SEGWIT_WIF_PRIVATE_KEY).unwrap(),
    TapSighashType::Default,
    false,
  );
  assert!(
    matches!(
      result,
      Verification::Invalid(Error::SignatureInvalid { .. })
    ),
    "got {result:?}"
  );

  for (sighash_type, explicit_default) in [
    (TapSighashType::None, false),
    (TapSighashType::Default, true),
  ] {
    let result = verify(&private_key, sighash_type, explicit_default);
    assert!(
      matches!(
        result,
        Verification::Invalid(Error::SigHashTypeUnsupported { .. })
      ),
      "{sighash_type:?}: got {result:?}"
    );
  }
}

#[test]
fn p2tr_empty_witness_and_wrong_length_signatures_are_invalid() {
  let address = Address::from_str(TAPROOT_ADDRESS).unwrap().assume_checked();

  assert!(matches!(
    verify_simple(&address, "foo", Witness::new()),
    Verification::Invalid(Error::WitnessEmpty)
  ));

  let signature = crate::sign::sign_simple(
    &address,
    "foo",
    &[PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap()],
    None,
  )
  .unwrap()
  .nth(0)
  .unwrap()
  .to_vec();
  assert_eq!(signature.len(), 65);

  for length in [63, 66] {
    let mut resized = signature.clone();
    resized.resize(length, 1);
    let result = verify_simple(&address, "foo", Witness::from_slice(&[resized]));
    assert!(
      matches!(result, Verification::Invalid(Error::SignatureLength { length: found, .. }) if found == length),
      "{length}: got {result:?}"
    );
  }
}

#[test]
fn p2tr_single_key_template_rejects_oversized_and_empty_keys() {
  let private_key = PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap();
  let verify = |key: &[u8]| {
    let tapscript = ScriptBuf::builder()
      .push_slice(push_bytes(key))
      .push_opcode(opcodes::all::OP_CHECKSIG)
      .into_script();
    let (address, mut tx, _signature, control_block) =
      p2tr_script_path_spend(&tapscript, &private_key, TapSighashType::Default);
    tx.input[0].witness = Witness::from_slice(&[vec![1; 64], tapscript.to_bytes(), control_block]);
    verify_full(&address, "foo", tx)
  };

  // No push may exceed the element size limit.
  assert!(matches!(
    verify(&[7; 521]),
    Verification::Invalid(Error::InvalidWitness)
  ));
  // BIP342: an empty public key fails the script.
  assert!(matches!(
    verify(&[]),
    Verification::Invalid(Error::ScriptNotSatisfied)
  ));
}
