use super::fixtures::*;
use super::*;
use pretty_assertions::assert_eq;

#[test]
fn sign_psbt_rejects_mismatched_key() {
  #[track_caller]
  fn case(address: &str, key: &str) {
    let address = Address::from_str(address).unwrap().assume_checked();

    let mut psbt = create_bip322_psbt(&address, "foo", None, &[], LockParams::default()).unwrap();

    let result = sign_bip322_psbt_input(&mut psbt, &PrivateKey::from_wif(key).unwrap(), 0);

    assert!(
      matches!(result, Err(Error::PublicKeyMismatch)),
      "got {result:?}"
    );
  }

  case(TAPROOT_ADDRESS, NESTED_SEGWIT_WIF_PRIVATE_KEY);
  case(SEGWIT_ADDRESS, NESTED_SEGWIT_WIF_PRIVATE_KEY);
  case(LEGACY_ADDRESS, NESTED_SEGWIT_WIF_PRIVATE_KEY);
  case(NESTED_SEGWIT_ADDRESS, WIF_PRIVATE_KEY);
}

#[test]
fn sign_psbt_rejects_script_not_matching_challenge() {
  let address = Address::from_str(P2WSH_2OF2_ADDRESS)
    .unwrap()
    .assume_checked();

  let mut psbt = create_bip322_psbt(
    &address,
    P2WSH_2OF2_MESSAGE,
    Some(&ScriptBuf::from_hex(P2WSH_2OF2_WITNESS_SCRIPT).unwrap()),
    &[],
    LockParams::default(),
  )
  .unwrap();

  // a coordinator swapping in an unrelated script must not get a signature
  psbt.inputs[0].witness_script =
    Some(ScriptBuf::from_hex(P2SH_P2WSH_2OF2_WITNESS_SCRIPT).unwrap());

  assert!(matches!(
    sign_bip322_psbt_input(
      &mut psbt,
      &PrivateKey::from_wif(P2SH_P2WSH_2OF2_PRIVATE_KEY_1).unwrap(),
      0
    ),
    Err(Error::WitnessScriptMismatch)
  ));
}

#[test]
fn sign_psbt_rejects_script_layout_not_matching_challenge() {
  // witness_script present, but the challenge is the bare P2SH of the script
  let address = Address::from_str(P2SH_MULTISIG_2OF2_ADDRESS)
    .unwrap()
    .assume_checked();

  let mut psbt = create_bip322_psbt(
    &address,
    "foo",
    Some(&ScriptBuf::from_hex(P2SH_MULTISIG_2OF2_REDEEM_SCRIPT).unwrap()),
    &[],
    LockParams::default(),
  )
  .unwrap();

  psbt.inputs[0].witness_script = psbt.inputs[0].redeem_script.take();

  assert!(matches!(
    sign_bip322_psbt_input(
      &mut psbt,
      &PrivateKey::from_wif(P2SH_MULTISIG_2OF2_PRIVATE_KEY_1).unwrap(),
      0
    ),
    Err(Error::WitnessScriptMismatch)
  ));

  // only redeem_script present, but the challenge is the P2WSH program
  let address = Address::from_str(P2WSH_2OF2_ADDRESS)
    .unwrap()
    .assume_checked();

  let mut psbt = create_bip322_psbt(
    &address,
    P2WSH_2OF2_MESSAGE,
    Some(&ScriptBuf::from_hex(P2WSH_2OF2_WITNESS_SCRIPT).unwrap()),
    &[],
    LockParams::default(),
  )
  .unwrap();

  psbt.inputs[0].redeem_script = psbt.inputs[0].witness_script.take();

  assert!(matches!(
    sign_bip322_psbt_input(
      &mut psbt,
      &PrivateKey::from_wif(P2WSH_2OF2_PRIVATE_KEY_1).unwrap(),
      0
    ),
    Err(Error::WitnessScriptMismatch)
  ));
}

#[test]
fn psbt_roles_reject_ordinary_psbt() {
  let address = Address::from_str(SEGWIT_ADDRESS).unwrap().assume_checked();
  let to_spend = create_to_spend(&address, "foo");

  // no PSBT_GLOBAL_GENERIC_SIGNED_MESSAGE
  let mut psbt = create_to_sign(&to_spend, None, LockParams::default());
  assert!(detect_bip322_psbt(&psbt).is_none());

  assert!(matches!(
    sign_bip322_psbt_input(
      &mut psbt,
      &PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap(),
      0
    ),
    Err(Error::OrdinaryPsbt)
  ));

  assert!(matches!(
    finalize_bip322_psbt(psbt),
    Err(Error::OrdinaryPsbt)
  ));
}

#[test]
fn sign_psbt_rejects_unknown_signer() {
  let address = Address::from_str(P2WSH_2OF2_ADDRESS)
    .unwrap()
    .assume_checked();

  let mut psbt = create_bip322_psbt(
    &address,
    P2WSH_2OF2_MESSAGE,
    Some(&ScriptBuf::from_hex(P2WSH_2OF2_WITNESS_SCRIPT).unwrap()),
    &[],
    LockParams::default(),
  )
  .unwrap();

  assert!(matches!(
    sign_bip322_psbt_input(
      &mut psbt,
      &PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap(),
      0
    ),
    Err(Error::UnknownSigner)
  ));
}

#[test]
fn finalize_psbt_rejects_missing_signatures() {
  let address = Address::from_str(P2WSH_2OF2_ADDRESS)
    .unwrap()
    .assume_checked();

  let mut psbt = create_bip322_psbt(
    &address,
    P2WSH_2OF2_MESSAGE,
    Some(&ScriptBuf::from_hex(P2WSH_2OF2_WITNESS_SCRIPT).unwrap()),
    &[],
    LockParams::default(),
  )
  .unwrap();

  sign_bip322_psbt_input(
    &mut psbt,
    &PrivateKey::from_wif(P2WSH_2OF2_PRIVATE_KEY_1).unwrap(),
    0,
  )
  .unwrap();

  assert!(matches!(
    finalize_bip322_psbt(psbt),
    Err(Error::SignatureCount {
      required: 2,
      provided: 1
    })
  ));
}

#[test]
fn finalize_psbt_accepts_duplicate_key_in_one_of_two_multisig() {
  let private_key = PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap();
  let public_key = private_key.public_key(&Secp256k1::new());
  let witness_script = ScriptBuf::builder()
    .push_opcode(opcodes::all::OP_PUSHNUM_1)
    .push_key(&public_key)
    .push_key(&public_key)
    .push_opcode(opcodes::all::OP_PUSHNUM_2)
    .push_opcode(opcodes::all::OP_CHECKMULTISIG)
    .into_script();
  let address = Address::p2wsh(&witness_script, bitcoin::Network::Bitcoin);
  let mut psbt = create_bip322_psbt(
    &address,
    "foo",
    Some(&witness_script),
    &[],
    LockParams::default(),
  )
  .unwrap();
  sign_bip322_psbt_input(&mut psbt, &private_key, 0).unwrap();

  let encoded = finalize_bip322_psbt(psbt).unwrap();
  assert_valid(verify_full_encoded(&address.to_string(), "foo", &encoded));
}

#[test]
fn finalize_psbt_rejects_multisig_script_not_matching_challenge() {
  let address = Address::from_str(P2WSH_2OF2_ADDRESS)
    .unwrap()
    .assume_checked();

  let mut psbt = create_bip322_psbt(
    &address,
    P2WSH_2OF2_MESSAGE,
    Some(&ScriptBuf::from_hex(P2WSH_2OF2_WITNESS_SCRIPT).unwrap()),
    &[],
    LockParams::default(),
  )
  .unwrap();

  sign_bip322_psbt_input(
    &mut psbt,
    &PrivateKey::from_wif(P2WSH_2OF2_PRIVATE_KEY_1).unwrap(),
    0,
  )
  .unwrap();
  sign_bip322_psbt_input(
    &mut psbt,
    &PrivateKey::from_wif(P2WSH_2OF2_PRIVATE_KEY_2).unwrap(),
    0,
  )
  .unwrap();

  // a coordinator swapping in an unrelated script must not get a proof
  psbt.inputs[0].witness_script =
    Some(ScriptBuf::from_hex(P2SH_P2WSH_2OF2_WITNESS_SCRIPT).unwrap());

  assert!(matches!(
    finalize_bip322_psbt(psbt),
    Err(Error::WitnessScriptMismatch)
  ));
}

#[test]
fn finalize_psbt_rejects_script_layout_not_matching_challenge() {
  let address = Address::from_str(P2WSH_2OF2_ADDRESS)
    .unwrap()
    .assume_checked();

  let mut psbt = create_bip322_psbt(
    &address,
    P2WSH_2OF2_MESSAGE,
    Some(&ScriptBuf::from_hex(P2WSH_2OF2_WITNESS_SCRIPT).unwrap()),
    &[],
    LockParams::default(),
  )
  .unwrap();

  sign_bip322_psbt_input(
    &mut psbt,
    &PrivateKey::from_wif(P2WSH_2OF2_PRIVATE_KEY_1).unwrap(),
    0,
  )
  .unwrap();
  sign_bip322_psbt_input(
    &mut psbt,
    &PrivateKey::from_wif(P2WSH_2OF2_PRIVATE_KEY_2).unwrap(),
    0,
  )
  .unwrap();

  // a coordinator moving the script into the wrong field must not get a
  // legacy-scriptSig proof for a P2WSH challenge
  psbt.inputs[0].redeem_script = psbt.inputs[0].witness_script.take();

  assert!(matches!(
    finalize_bip322_psbt(psbt),
    Err(Error::WitnessScriptMismatch)
  ));
}

#[test]
fn sign_psbt_rejects_out_of_range_input() {
  let address = Address::from_str(SEGWIT_ADDRESS).unwrap().assume_checked();

  let mut psbt = create_bip322_psbt(&address, "foo", None, &[], LockParams::default()).unwrap();

  assert!(matches!(
    sign_bip322_psbt_input(
      &mut psbt,
      &PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap(),
      1
    ),
    Err(Error::ToSignInvalid)
  ));
}

#[test]
fn finalize_psbt_rejects_unsigned_single_sig() {
  let address = Address::from_str(SEGWIT_ADDRESS).unwrap().assume_checked();

  let psbt = create_bip322_psbt(&address, "foo", None, &[], LockParams::default()).unwrap();

  assert!(matches!(
    finalize_bip322_psbt(psbt),
    Err(Error::SignatureCount {
      required: 1,
      provided: 0
    })
  ));
}

#[test]
fn finalize_psbt_rejects_mismatched_partial_sig_key() {
  let address = Address::from_str(SEGWIT_ADDRESS).unwrap().assume_checked();

  let mut psbt = create_bip322_psbt(&address, "foo", None, &[], LockParams::default()).unwrap();

  // a signature from a key that does not satisfy the challenge
  let secp = Secp256k1::new();
  let stranger = PrivateKey::from_wif(NESTED_SEGWIT_WIF_PRIVATE_KEY).unwrap();

  psbt.inputs[0].partial_sigs.insert(
    stranger.public_key(&secp),
    bitcoin::ecdsa::Signature {
      signature: secp.sign_ecdsa(&secp256k1::Message::from_digest([0; 32]), &stranger.inner),
      sighash_type: EcdsaSighashType::All,
    },
  );

  assert!(matches!(
    finalize_bip322_psbt(psbt),
    Err(Error::PublicKeyMismatch)
  ));
}

#[test]
fn finalize_psbt_rejects_extra_partial_sigs() {
  let address = Address::from_str(SEGWIT_ADDRESS).unwrap().assume_checked();

  let mut psbt = create_bip322_psbt(&address, "foo", None, &[], LockParams::default()).unwrap();

  sign_bip322_psbt_input(
    &mut psbt,
    &PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap(),
    0,
  )
  .unwrap();

  // a second signer's signature on a single-sig challenge
  let secp = Secp256k1::new();
  let stranger = PrivateKey::from_wif(NESTED_SEGWIT_WIF_PRIVATE_KEY).unwrap();

  psbt.inputs[0].partial_sigs.insert(
    stranger.public_key(&secp),
    bitcoin::ecdsa::Signature {
      signature: secp.sign_ecdsa(&secp256k1::Message::from_digest([0; 32]), &stranger.inner),
      sighash_type: EcdsaSighashType::All,
    },
  );

  assert!(matches!(
    finalize_bip322_psbt(psbt),
    Err(Error::SignatureCount {
      required: 1,
      provided: 2
    })
  ));
}

#[test]
fn finalize_psbt_rejects_unrelated_multisig_sig_with_conflicting_sighash() {
  let address = Address::from_str(P2WSH_2OF2_ADDRESS)
    .unwrap()
    .assume_checked();
  let mut psbt = create_bip322_psbt(
    &address,
    P2WSH_2OF2_MESSAGE,
    Some(&ScriptBuf::from_hex(P2WSH_2OF2_WITNESS_SCRIPT).unwrap()),
    &[],
    LockParams::default(),
  )
  .unwrap();
  psbt.inputs[0].sighash_type = Some(EcdsaSighashType::All.into());
  for key in [P2WSH_2OF2_PRIVATE_KEY_1, P2WSH_2OF2_PRIVATE_KEY_2] {
    sign_bip322_psbt_input(&mut psbt, &PrivateKey::from_wif(key).unwrap(), 0).unwrap();
  }

  let secp = Secp256k1::new();
  let stranger = PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap();
  psbt.inputs[0].partial_sigs.insert(
    stranger.public_key(&secp),
    bitcoin::ecdsa::Signature {
      signature: secp.sign_ecdsa(&Message::from_digest([0; 32]), &stranger.inner),
      sighash_type: EcdsaSighashType::None,
    },
  );

  assert!(matches!(
    finalize_bip322_psbt(psbt),
    Err(Error::SigHashTypeUnsupported { .. })
  ));
}

#[test]
fn finalize_psbt_rejects_tap_key_sig_on_non_p2tr_challenge() {
  let address = Address::from_str(SEGWIT_ADDRESS).unwrap().assume_checked();

  let mut psbt = create_bip322_psbt(&address, "foo", None, &[], LockParams::default()).unwrap();

  let secp = Secp256k1::new();
  let key_pair =
    Keypair::from_secret_key(&secp, &PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap().inner);

  psbt.inputs[0].tap_key_sig = Some(bitcoin::taproot::Signature {
    signature: secp.sign_schnorr_no_aux_rand(&secp256k1::Message::from_digest([0; 32]), &key_pair),
    sighash_type: TapSighashType::All,
  });

  assert!(matches!(
    finalize_bip322_psbt(psbt),
    Err(Error::PublicKeyMismatch)
  ));
}

#[test]
fn create_psbt_rejects_witness_script_for_single_sig() {
  #[track_caller]
  fn case(address: &str) {
    let address = Address::from_str(address).unwrap().assume_checked();

    assert!(matches!(
      create_bip322_psbt(
        &address,
        "foo",
        Some(&ScriptBuf::from_hex(P2WSH_2OF2_WITNESS_SCRIPT).unwrap()),
        &[],
        LockParams::default(),
      ),
      Err(Error::InvalidWitness)
    ));
  }

  case(TAPROOT_ADDRESS);
  case(SEGWIT_ADDRESS);
  case(LEGACY_ADDRESS);
}

#[test]
fn create_psbt_rejects_unknown_p2sh_script() {
  let address = Address::from_str(P2SH_MULTISIG_2OF2_ADDRESS)
    .unwrap()
    .assume_checked();

  assert!(matches!(
    create_bip322_psbt(
      &address,
      "foo",
      Some(&ScriptBuf::from_hex(P2WSH_2OF2_WITNESS_SCRIPT).unwrap()),
      &[],
      LockParams::default(),
    ),
    Err(Error::WitnessScriptMismatch)
  ));
}

#[test]
fn sign_psbt_rejects_mismatched_non_witness_utxo() {
  let address = Address::from_str(POF_P2TR_ADDRESS)
    .unwrap()
    .assume_checked();

  let mut psbt = create_bip322_psbt(
    &address,
    POF_P2TR_MESSAGE,
    None,
    &[pof_p2tr_proof_input()],
    LockParams::default(),
  )
  .unwrap();

  // a coordinator swapping in an unrelated previous transaction
  psbt.inputs[1].witness_utxo = None;
  psbt.inputs[1].non_witness_utxo = Some(create_to_spend(&address, "bar"));

  assert!(matches!(
    sign_bip322_psbt_input(
      &mut psbt,
      &PrivateKey::from_wif(POF_P2TR_PROVEN_KEY_1).unwrap(),
      1
    ),
    Err(Error::ToSignInvalid)
  ));
}

#[test]
fn sign_psbt_rejects_uncompressed_key_for_segwit() {
  let address = Address::from_str(SEGWIT_ADDRESS).unwrap().assume_checked();

  let mut psbt = create_bip322_psbt(&address, "foo", None, &[], LockParams::default()).unwrap();

  assert!(matches!(
    sign_bip322_psbt_input(
      &mut psbt,
      &PrivateKey::from_wif(UNCOMPRESSED_WIF_PRIVATE_KEY).unwrap(),
      0
    ),
    Err(Error::UncompressedPublicKey { .. })
  ));
}

#[test]
fn psbt_message_sighash_and_finalizer_rules_are_enforced() {
  let address = Address::from_str(SEGWIT_ADDRESS).unwrap().assume_checked();
  assert!(matches!(
    create_bip322_psbt(&address, [0xff], None, &[], LockParams::default()),
    Err(Error::MessageNotUtf8)
  ));
  assert!(matches!(
    sign_pof(
      &address,
      [0xff],
      &[PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap()],
      None,
      &[pof_p2tr_proof_input()],
      LockParams::default(),
    ),
    Err(Error::MessageNotUtf8)
  ));

  let mut psbt = create_bip322_psbt(&address, "foo", None, &[], LockParams::default()).unwrap();
  psbt.unknown.insert(signed_message_key(), vec![0xff]);
  assert!(detect_bip322_psbt(&psbt).is_none());

  let mut psbt = create_bip322_psbt(&address, "foo", None, &[], LockParams::default()).unwrap();
  psbt.inputs[0].sighash_type = Some(EcdsaSighashType::None.into());
  assert!(sign_bip322_psbt_input(
    &mut psbt,
    &PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap(),
    0,
  )
  .is_err());

  let legacy = Address::from_str(LEGACY_ADDRESS).unwrap().assume_checked();
  let mut psbt = create_bip322_psbt(&legacy, "foo", None, &[], LockParams::default()).unwrap();
  psbt.inputs[0].witness_utxo = psbt.inputs[0]
    .non_witness_utxo
    .as_ref()
    .map(|tx| tx.output[0].clone());
  psbt.inputs[0].non_witness_utxo = None;
  assert!(sign_bip322_psbt_input(
    &mut psbt,
    &PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap(),
    0,
  )
  .is_err());
  assert!(finalize_bip322_psbt(psbt).is_err());
}

#[test]
fn finalize_psbt_accepts_default_tap_key_sig_without_declared_sighash() {
  let address = Address::from_str(TAPROOT_ADDRESS).unwrap().assume_checked();
  let mut psbt = create_bip322_psbt(&address, "foo", None, &[], LockParams::default()).unwrap();
  psbt.inputs[0].sighash_type = Some(TapSighashType::Default.into());
  sign_bip322_psbt_input(
    &mut psbt,
    &PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap(),
    0,
  )
  .unwrap();
  psbt.inputs[0].sighash_type = None;
  assert_eq!(psbt.inputs[0].tap_key_sig.unwrap().to_vec().len(), 64);

  let encoded = finalize_bip322_psbt(psbt).unwrap();
  assert_valid(verify_full_encoded(TAPROOT_ADDRESS, "foo", &encoded));
}

#[test]
fn finalize_psbt_rejects_taproot_sighash_type_mismatches() {
  for (declared, signed) in [
    (TapSighashType::All, TapSighashType::Default),
    (TapSighashType::Default, TapSighashType::All),
  ] {
    let address = Address::from_str(TAPROOT_ADDRESS).unwrap().assume_checked();
    let mut psbt = create_bip322_psbt(&address, "foo", None, &[], LockParams::default()).unwrap();
    psbt.inputs[0].sighash_type = Some(signed.into());
    sign_bip322_psbt_input(
      &mut psbt,
      &PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap(),
      0,
    )
    .unwrap();
    psbt.inputs[0].sighash_type = Some(declared.into());

    assert!(matches!(
      finalize_bip322_psbt(psbt),
      Err(Error::SigHashTypeUnsupported { .. })
    ));
  }
}

#[test]
fn taproot_psbt_default_sighash_and_finalizer_cleanup() {
  let address = Address::from_str(POF_P2TR_ADDRESS)
    .unwrap()
    .assume_checked();
  let mut psbt = create_bip322_psbt(
    &address,
    POF_P2TR_MESSAGE,
    None,
    &[pof_p2tr_proof_input()],
    LockParams::default(),
  )
  .unwrap();
  psbt.inputs[0].sighash_type = Some(TapSighashType::Default.into());
  sign_bip322_psbt_input(
    &mut psbt,
    &PrivateKey::from_wif(POF_P2TR_CHALLENGE_KEY).unwrap(),
    0,
  )
  .unwrap();
  assert_eq!(
    psbt.inputs[0].tap_key_sig.unwrap().sighash_type,
    TapSighashType::Default
  );
  sign_bip322_psbt_input(
    &mut psbt,
    &PrivateKey::from_wif(POF_P2TR_PROVEN_KEY_1).unwrap(),
    1,
  )
  .unwrap();

  let secp = Secp256k1::new();
  let private_key = PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap();
  let public_key = private_key.public_key(&secp);
  let xonly = public_key.inner.x_only_public_key().0;
  let ecdsa_signature = bitcoin::ecdsa::Signature {
    signature: secp.sign_ecdsa(&Message::from_digest([0; 32]), &private_key.inner),
    sighash_type: EcdsaSighashType::All,
  };
  let tap_signature = bitcoin::taproot::Signature {
    signature: secp.sign_schnorr_no_aux_rand(
      &Message::from_digest([0; 32]),
      &Keypair::from_secret_key(&secp, &private_key.inner),
    ),
    sighash_type: TapSighashType::All,
  };
  let mut control_bytes = vec![0xc0];
  control_bytes.extend_from_slice(&xonly.serialize());
  let control_block = bitcoin::taproot::ControlBlock::decode(&control_bytes).unwrap();
  let key_source: bitcoin::bip32::KeySource = Default::default();

  for input in &mut psbt.inputs {
    if input.sighash_type.is_none() {
      input.sighash_type = Some(TapSighashType::All.into());
    }
    input.partial_sigs.insert(public_key, ecdsa_signature);
    input.redeem_script = Some(ScriptBuf::new());
    input.witness_script = Some(ScriptBuf::new());
    input
      .bip32_derivation
      .insert(public_key.inner, key_source.clone());
    input.ripemd160_preimages.insert(
      bitcoin::hashes::ripemd160::Hash::from_byte_array([0; 20]),
      vec![0],
    );
    input
      .sha256_preimages
      .insert(sha256::Hash::from_byte_array([0; 32]), vec![0]);
    input.hash160_preimages.insert(
      bitcoin::hashes::hash160::Hash::from_byte_array([0; 20]),
      vec![0],
    );
    input.hash256_preimages.insert(
      bitcoin::hashes::sha256d::Hash::from_byte_array([0; 32]),
      vec![0],
    );
    input.tap_script_sigs.insert(
      (
        xonly,
        bitcoin::taproot::TapLeafHash::from_byte_array([0; 32]),
      ),
      tap_signature,
    );
    input.tap_scripts.insert(
      control_block.clone(),
      (ScriptBuf::new(), bitcoin::taproot::LeafVersion::TapScript),
    );
    input
      .tap_key_origins
      .insert(xonly, (vec![], key_source.clone()));
    input.tap_merkle_root = Some(bitcoin::taproot::TapNodeHash::from_byte_array([0; 32]));
  }

  let encoded = finalize_bip322_psbt(psbt).unwrap();
  let bytes = general_purpose::STANDARD
    .decode(&encoded[POF_SIGNATURE_PREFIX.len()..])
    .unwrap();
  let finalized = Psbt::deserialize(&bytes).unwrap();
  for input in &finalized.inputs {
    assert!(input.final_script_witness.is_some());
    assert!(input.sighash_type.is_none());
    assert!(input.redeem_script.is_none());
    assert!(input.witness_script.is_none());
    assert!(input.tap_key_sig.is_none());
    assert!(input.tap_internal_key.is_none());
    assert!(input.tap_merkle_root.is_none());
    assert!(input.partial_sigs.is_empty());
    assert!(input.tap_script_sigs.is_empty());
    assert!(input.tap_scripts.is_empty());
    assert!(input.tap_key_origins.is_empty());
    assert!(input.bip32_derivation.is_empty());
    assert!(input.ripemd160_preimages.is_empty());
    assert!(input.sha256_preimages.is_empty());
    assert!(input.hash160_preimages.is_empty());
    assert!(input.hash256_preimages.is_empty());
  }
  assert!(!finalized.unknown.is_empty());
  assert_valid(verify_pof(&address, POF_P2TR_MESSAGE, finalized));
}

#[test]
fn detection_requires_consistent_challenge_utxo_data() {
  let address = Address::from_str(LEGACY_ADDRESS).unwrap().assume_checked();
  let build = || create_bip322_psbt(&address, "foo", None, &[], LockParams::default()).unwrap();

  // A legacy challenge carries only the previous transaction.
  let psbt = build();
  assert!(psbt.inputs[0].witness_utxo.is_none());
  assert!(detect_bip322_psbt(&psbt).is_some());

  // Agreeing witness_utxo data is fine.
  let mut psbt = build();
  psbt.inputs[0].witness_utxo = Some(create_to_spend(&address, "foo").output[0].clone());
  assert!(detect_bip322_psbt(&psbt).is_some());

  // A previous transaction other than the one the challenge input spends.
  let mut psbt = build();
  psbt.inputs[0].non_witness_utxo = Some(create_to_spend(&address, "bar"));
  assert!(detect_bip322_psbt(&psbt).is_none());

  // A witness_utxo that disagrees with the previous transaction.
  let mut psbt = build();
  psbt.inputs[0].witness_utxo = Some(TxOut {
    value: Amount::ZERO,
    script_pubkey: ScriptBuf::new(),
  });
  assert!(detect_bip322_psbt(&psbt).is_none());

  // A previous transaction whose challenge output carries value.
  let mut psbt = build();
  let mut to_spend = create_to_spend(&address, "foo");
  to_spend.output[0].value = Amount::from_sat(1);
  psbt.unsigned_tx.input[0].previous_output.txid = to_spend.compute_txid();
  psbt.inputs[0].non_witness_utxo = Some(to_spend);
  assert!(detect_bip322_psbt(&psbt).is_none());
}

#[test]
fn psbt_roles_reject_unsupported_sighash_types() {
  let private_key = PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap();

  for (address, sighash_type) in [
    (TAPROOT_ADDRESS, TapSighashType::None.into()),
    (SEGWIT_ADDRESS, EcdsaSighashType::None.into()),
  ] {
    let address = Address::from_str(address).unwrap().assume_checked();
    let mut psbt = create_bip322_psbt(&address, "foo", None, &[], LockParams::default()).unwrap();
    psbt.inputs[0].sighash_type = Some(sighash_type);
    let result = sign_bip322_psbt_input(&mut psbt, &private_key, 0);
    assert!(
      matches!(result, Err(Error::SigHashTypeUnsupported { .. })),
      "{address}: got {result:?}"
    );
  }

  // A partial signature whose sighash type differs from the declared one.
  let address = Address::from_str(SEGWIT_ADDRESS).unwrap().assume_checked();
  let mut psbt = create_bip322_psbt(&address, "foo", None, &[], LockParams::default()).unwrap();
  sign_bip322_psbt_input(&mut psbt, &private_key, 0).unwrap();
  let (public_key, signature) = psbt.inputs[0].partial_sigs.pop_first().unwrap();
  psbt.inputs[0].partial_sigs.insert(
    public_key,
    bitcoin::ecdsa::Signature {
      sighash_type: EcdsaSighashType::None,
      ..signature
    },
  );
  assert!(matches!(
    finalize_bip322_psbt(psbt),
    Err(Error::SigHashTypeUnsupported { .. })
  ));
}
