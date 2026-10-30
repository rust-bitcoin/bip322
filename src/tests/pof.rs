use super::fixtures::*;
use super::*;
use pretty_assertions::assert_eq;

#[test]
fn roundtrip_pof_p2tr_with_inputs() {
  let proof_inputs = vec![
    ProofInput {
      outpoint: OutPoint {
        txid: "1111111111111111111111111111111111111111111111111111111111111111"
          .parse()
          .unwrap(),
        vout: 0,
      },
      prevout: TxOut {
        value: Amount::from_sat(345678),
        script_pubkey: ScriptBuf::from_hex(
          "5120788b90c2b523c73a4237d04df46b232858be3bbc0e65d8d049a7fa59d5719db8",
        )
        .unwrap(),
      },
      prev_tx: None,
      private_keys: vec![PrivateKey::from_wif(POF_P2TR_PROVEN_KEY_1).unwrap()],
      witness_script: None,
    },
    ProofInput {
      outpoint: OutPoint {
        txid: "2222222222222222222222222222222222222222222222222222222222222222"
          .parse()
          .unwrap(),
        vout: 1,
      },
      prevout: TxOut {
        value: Amount::from_sat(345678),
        script_pubkey: ScriptBuf::from_hex(
          "5120ca0dca0f4f6a2fe99f83c74ce304b031e4b94007b79ae2a94f35355563f9f5ca",
        )
        .unwrap(),
      },
      prev_tx: None,
      private_keys: vec![PrivateKey::from_wif(POF_P2TR_PROVEN_KEY_2).unwrap()],
      witness_script: None,
    },
    ProofInput {
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
    },
  ];

  let signature = sign_pof_encoded(
    POF_P2TR_ADDRESS,
    POF_P2TR_MESSAGE,
    &[POF_P2TR_CHALLENGE_KEY],
    None,
    &proof_inputs,
    LockParams::default(),
  )
  .unwrap();

  assert_valid(verify_pof_encoded(
    POF_P2TR_ADDRESS,
    POF_P2TR_MESSAGE,
    &signature,
  ));
}

#[test]
fn pof_tampered_witness_utxo_is_rejected() {
  let proof_inputs = vec![ProofInput {
    outpoint: OutPoint {
      txid: "1111111111111111111111111111111111111111111111111111111111111111"
        .parse()
        .unwrap(),
      vout: 0,
    },
    prevout: TxOut {
      value: Amount::from_sat(345678),
      script_pubkey: ScriptBuf::from_hex(
        "5120788b90c2b523c73a4237d04df46b232858be3bbc0e65d8d049a7fa59d5719db8",
      )
      .unwrap(),
    },
    prev_tx: None,
    private_keys: vec![PrivateKey::from_wif(POF_P2TR_PROVEN_KEY_1).unwrap()],
    witness_script: None,
  }];
  let address = Address::from_str(POF_P2TR_ADDRESS)
    .unwrap()
    .assume_checked();

  let mut psbt = sign_pof(
    &address,
    POF_P2TR_MESSAGE,
    &[PrivateKey::from_wif(POF_P2TR_CHALLENGE_KEY).unwrap()],
    None,
    &proof_inputs,
    LockParams::default(),
  )
  .unwrap();

  psbt.inputs[1].witness_utxo.as_mut().unwrap().script_pubkey =
    ScriptBuf::from_hex("5120ca0dca0f4f6a2fe99f83c74ce304b031e4b94007b79ae2a94f35355563f9f5ca")
      .unwrap();

  // Taproot signatures commit to every previous output, so even the
  // challenge's signature no longer verifies.
  assert!(matches!(
    verify_pof(&address, POF_P2TR_MESSAGE, psbt),
    Verification::Invalid(Error::SignatureInvalid { .. })
  ));
}

#[test]
fn roundtrip_pof_with_legacy_input() {
  let secp = Secp256k1::new();
  let legacy_key = PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap();
  let legacy_spk = ScriptBuf::new_p2pkh(&legacy_key.public_key(&secp).pubkey_hash());

  // The real previous transaction whose output the proof claims
  let prev_tx = Transaction {
    version: Version(2),
    lock_time: LockTime::ZERO,
    input: vec![TxIn::default()],
    output: vec![TxOut {
      value: Amount::from_sat(345678),
      script_pubkey: legacy_spk.clone(),
    }],
  };

  let proof_inputs = vec![ProofInput {
    outpoint: OutPoint {
      txid: prev_tx.compute_txid(),
      vout: 0,
    },
    prevout: prev_tx.output[0].clone(),
    prev_tx: Some(prev_tx),
    private_keys: vec![legacy_key],
    witness_script: None,
  }];

  assert_valid(verify_pof_encoded(
    POF_P2TR_ADDRESS,
    POF_P2TR_MESSAGE,
    &sign_pof_encoded(
      POF_P2TR_ADDRESS,
      POF_P2TR_MESSAGE,
      &[POF_P2TR_CHALLENGE_KEY],
      None,
      &proof_inputs,
      LockParams::default(),
    )
    .unwrap(),
  ));
}

#[test]
fn sign_pof_rejects_no_proof_inputs() {
  assert!(matches!(
    sign_pof(
      &Address::from_str(POF_P2TR_ADDRESS)
        .unwrap()
        .assume_checked(),
      POF_P2TR_MESSAGE,
      &[PrivateKey::from_wif(POF_P2TR_CHALLENGE_KEY).unwrap()],
      None,
      &[],
      LockParams::default()
    ),
    Err(Error::NoProofInputs)
  ));
}

#[test]
fn roundtrip_pof_with_p2sh_multisig_input() {
  let spk = Address::from_str(P2SH_MULTISIG_2OF2_ADDRESS)
    .unwrap()
    .assume_checked()
    .script_pubkey();

  let prev_tx = Transaction {
    version: Version(2),
    lock_time: LockTime::ZERO,
    input: vec![TxIn::default()],
    output: vec![TxOut {
      value: Amount::from_sat(345678),
      script_pubkey: spk.clone(),
    }],
  };

  let proof_inputs = vec![ProofInput {
    outpoint: OutPoint {
      txid: prev_tx.compute_txid(),
      vout: 0,
    },
    prevout: prev_tx.output[0].clone(),
    prev_tx: Some(prev_tx),
    private_keys: vec![
      PrivateKey::from_wif(P2SH_MULTISIG_2OF2_PRIVATE_KEY_1).unwrap(),
      PrivateKey::from_wif(P2SH_MULTISIG_2OF2_PRIVATE_KEY_2).unwrap(),
    ],
    witness_script: Some(ScriptBuf::from_hex(P2SH_MULTISIG_2OF2_REDEEM_SCRIPT).unwrap()),
  }];

  let to_sign = sign_pof(
    &Address::from_str(POF_P2TR_ADDRESS)
      .unwrap()
      .assume_checked(),
    POF_P2TR_MESSAGE,
    &[PrivateKey::from_wif(POF_P2TR_CHALLENGE_KEY).unwrap()],
    None,
    &proof_inputs,
    LockParams::default(),
  )
  .unwrap();

  // a non-segwit input must carry the full previous transaction (BIP-174)
  assert!(to_sign.inputs[1].witness_utxo.is_none());
  assert!(to_sign.inputs[1].non_witness_utxo.is_some());

  assert!(matches!(
    verify_pof(
      &Address::from_str(POF_P2TR_ADDRESS)
        .unwrap()
        .assume_checked(),
      POF_P2TR_MESSAGE,
      to_sign
    ),
    Verification::Valid { .. }
  ));
}

#[test]
fn timelocked_pof_reports_time_and_age() {
  let locks = LockParams {
    lock_time: LockTime::from_height(800_000).unwrap(),
    sequence: Sequence(144),
  };

  let signature = sign_pof_encoded(
    POF_P2TR_ADDRESS,
    POF_P2TR_MESSAGE,
    &[POF_P2TR_CHALLENGE_KEY],
    None,
    &[pof_p2tr_proof_input()],
    locks,
  )
  .unwrap();

  assert!(matches!(
    verify_pof_encoded(POF_P2TR_ADDRESS, POF_P2TR_MESSAGE, &signature),
    Verification::Valid { time, age }
      if time == locks.lock_time && age == locks.sequence
  ));
}

#[test]
fn pof_uninterpretable_input_is_inconclusive() {
  let address = Address::from_str(SEGWIT_ADDRESS).unwrap().assume_checked();

  let mut psbt = sign_pof(
    &address,
    POF_P2TR_MESSAGE,
    &[PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap()],
    None,
    &[pof_p2tr_proof_input()],
    LockParams::default(),
  )
  .unwrap();

  psbt.inputs[1].witness_utxo.as_mut().unwrap().script_pubkey =
    ScriptBuf::from_hex("52200000000000000000000000000000000000000000000000000000000000000000")
      .unwrap();

  assert!(matches!(
    verify_pof(&address, POF_P2TR_MESSAGE, psbt),
    Verification::Inconclusive
  ));
}

#[test]
fn pof_rejects_mismatched_or_non_utf8_signed_message_field() {
  for value in [b"different message".to_vec(), vec![0xff]] {
    let utf8 = std::str::from_utf8(&value).is_ok();
    let (address, mut psbt) = pof_with_p2wpkh_challenge(&[pof_p2tr_proof_input()]);
    psbt.unknown.insert(signed_message_key(), value);

    let result = verify_pof(&address, POF_P2TR_MESSAGE, psbt);
    if utf8 {
      assert!(
        matches!(result, Verification::Invalid(Error::ToSignInvalid)),
        "got {result:?}"
      );
    } else {
      assert!(
        matches!(result, Verification::Invalid(Error::MessageNotUtf8)),
        "got {result:?}"
      );
    }
  }
}

#[test]
fn pof_challenge_utxo_must_be_the_challenge_output() {
  let secp = Secp256k1::new();
  let victim = Address::from_str(SEGWIT_ADDRESS).unwrap().assume_checked();
  let victim_key = PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap();
  let attacker_key = PrivateKey::from_wif(NESTED_SEGWIT_WIF_PRIVATE_KEY).unwrap();

  // Signs every input against the UTXO data the PSBT itself carries.
  let sign = |mut psbt: Psbt, challenge_key: &PrivateKey| {
    let prevouts: Vec<TxOut> = psbt
      .inputs
      .iter()
      .map(|input| input.witness_utxo.clone().unwrap())
      .collect();
    let challenge =
      create_message_signature_p2wpkh(&psbt, challenge_key, &prevouts[0], 0, false).unwrap();
    let proof = create_message_signature_taproot(
      &psbt,
      &PrivateKey::from_wif(POF_P2TR_PROVEN_KEY_1).unwrap(),
      &prevouts,
      1,
      None,
    )
    .unwrap();
    psbt.inputs[0].final_script_witness = Some(challenge);
    psbt.inputs[1].final_script_witness = Some(proof);
    psbt
  };

  let unsigned = create_bip322_psbt(
    &victim,
    POF_P2TR_MESSAGE,
    None,
    &[pof_p2tr_proof_input()],
    LockParams::default(),
  )
  .unwrap();
  assert_valid(verify_pof(
    &victim,
    POF_P2TR_MESSAGE,
    sign(unsigned.clone(), &victim_key),
  ));

  for (challenge_utxo, challenge_key) in [
    // An attacker's own script, signed by the attacker.
    (
      TxOut {
        value: Amount::ZERO,
        script_pubkey: ScriptBuf::new_p2wpkh(
          &attacker_key.public_key(&secp).wpubkey_hash().unwrap(),
        ),
      },
      attacker_key,
    ),
    // The victim's script with a different value.
    (
      TxOut {
        value: Amount::from_sat(1),
        script_pubkey: victim.script_pubkey(),
      },
      victim_key,
    ),
  ] {
    let mut psbt = unsigned.clone();
    psbt.inputs[0].witness_utxo = Some(challenge_utxo);
    let result = verify_pof(&victim, POF_P2TR_MESSAGE, sign(psbt, &challenge_key));
    assert!(
      matches!(result, Verification::Invalid(Error::ToSignInvalid)),
      "got {result:?}"
    );
  }
}

#[test]
fn pof_challenge_is_bound_to_message() {
  let (address, mut psbt) = pof_with_p2wpkh_challenge(&[pof_p2tr_proof_input()]);
  assert!(psbt
    .unknown
    .remove(&bitcoin::psbt::raw::Key {
      type_value: PSBT_GLOBAL_GENERIC_SIGNED_MESSAGE,
      key: vec![],
    })
    .is_some());
  assert_valid(verify_pof(&address, POF_P2TR_MESSAGE, psbt.clone()));
  assert!(matches!(
    verify_pof(&address, "different message", psbt),
    Verification::Invalid(Error::ToSignInvalid)
  ));

  assert_valid(verify_pof_encoded(
    POF_P2TR_ADDRESS,
    POF_P2TR_MESSAGE,
    POF_P2TR_SIGNATURE,
  ));
  assert!(matches!(
    verify_pof_encoded(POF_P2TR_ADDRESS, "different message", POF_P2TR_SIGNATURE),
    Verification::Invalid(Error::ToSignInvalid)
  ));
}

#[test]
fn pof_codeseparator_check_is_independent_of_input_order() {
  let second_proof_input = ProofInput {
    outpoint: OutPoint {
      txid: "2222222222222222222222222222222222222222222222222222222222222222"
        .parse()
        .unwrap(),
      vout: 0,
    },
    ..pof_p2tr_proof_input()
  };
  let (address, psbt) = pof_with_p2wpkh_challenge(&[pof_p2tr_proof_input(), second_proof_input]);

  let codeseparator_script = ScriptBuf::builder()
    .push_opcode(opcodes::all::OP_CODESEPARATOR)
    .push_opcode(opcodes::all::OP_PUSHNUM_1)
    .into_script();

  let mut psbt = psbt;
  psbt.inputs[1].witness_utxo.as_mut().unwrap().script_pubkey =
    ScriptBuf::from_hex("52200000000000000000000000000000000000000000000000000000000000000000")
      .unwrap();
  psbt.inputs[2].witness_utxo.as_mut().unwrap().script_pubkey =
    ScriptBuf::new_p2wsh(&codeseparator_script.wscript_hash());
  psbt.inputs[2].final_script_sig = None;
  psbt.inputs[2].final_script_witness = Some(Witness::from_slice(&[codeseparator_script
    .as_bytes()
    .to_vec()]));

  // The first proof input is uninterpretable, but must not hide the
  // required-rule violation in the second.
  assert!(matches!(
    verify_pof(&address, POF_P2TR_MESSAGE, psbt.clone()),
    Verification::Invalid(Error::CodeSeparator)
  ));

  let mut reversed = psbt;
  reversed.unsigned_tx.input.swap(1, 2);
  reversed.inputs.swap(1, 2);
  assert!(matches!(
    verify_pof(&address, POF_P2TR_MESSAGE, reversed),
    Verification::Invalid(Error::CodeSeparator)
  ));
}

#[test]
fn pof_bare_codeseparator_script_is_invalid() {
  let codeseparator_script = ScriptBuf::builder()
    .push_opcode(opcodes::all::OP_CODESEPARATOR)
    .push_opcode(opcodes::all::OP_PUSHNUM_1)
    .into_script();
  let (address, mut psbt) = pof_with_bare_proof_input(codeseparator_script);

  assert!(matches!(
    verify_pof(&address, POF_P2TR_MESSAGE, psbt.clone()),
    Verification::Invalid(Error::CodeSeparator)
  ));

  // Required rules also precede the upgradeable version rule for PoF.
  psbt.unsigned_tx.version = Version(3);
  assert!(matches!(
    verify_pof(&address, POF_P2TR_MESSAGE, psbt),
    Verification::Invalid(Error::CodeSeparator)
  ));
}

#[test]
fn pof_bare_codeseparator_byte_in_pushed_data_is_not_an_opcode() {
  // 0xab inside pushed data is data, not OP_CODESEPARATOR. The challenge is
  // validly signed, and miniscript cannot express the script, so the proof
  // is inconclusive rather than invalid.
  let script = ScriptBuf::builder()
    .push_slice([0xab; 32])
    .push_opcode(opcodes::all::OP_DROP)
    .push_opcode(opcodes::all::OP_PUSHNUM_1)
    .into_script();
  let (address, psbt) = pof_with_bare_proof_input(script);

  let result = verify_pof(&address, POF_P2TR_MESSAGE, psbt);
  assert!(
    matches!(result, Verification::Inconclusive),
    "got {result:?}"
  );
}

#[test]
fn pof_same_txid_non_witness_utxo_fallback() {
  let key = PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap();
  let spk = ScriptBuf::new_p2pkh(&key.public_key(&Secp256k1::new()).pubkey_hash());

  let prev_tx = Transaction {
    version: Version(2),
    lock_time: LockTime::ZERO,
    input: vec![TxIn::default()],
    output: vec![
      TxOut {
        value: Amount::from_sat(1),
        script_pubkey: spk.clone(),
      },
      TxOut {
        value: Amount::from_sat(2),
        script_pubkey: spk,
      },
    ],
  };

  let txid = prev_tx.compute_txid();

  let proof_inputs: Vec<ProofInput> = (0..2)
    .map(|vout| ProofInput {
      outpoint: OutPoint { txid, vout },
      prevout: prev_tx.output[vout as usize].clone(),
      prev_tx: Some(prev_tx.clone()),
      private_keys: vec![key],
      witness_script: None,
    })
    .collect();

  let address = Address::from_str(POF_P2TR_ADDRESS)
    .unwrap()
    .assume_checked();

  let sign = || {
    sign_pof(
      &address,
      POF_P2TR_MESSAGE,
      &[PrivateKey::from_wif(POF_P2TR_CHALLENGE_KEY).unwrap()],
      None,
      &proof_inputs,
      LockParams::default(),
    )
    .unwrap()
  };

  // the second proof input resolves via the first input's non_witness_utxo
  let mut psbt = sign();
  psbt.inputs[2].non_witness_utxo = None;
  assert!(matches!(
    verify_pof(&address, POF_P2TR_MESSAGE, psbt),
    Verification::Valid { .. }
  ));
  // neither input carries the previous transaction
  let mut psbt = sign();
  psbt.inputs[1].non_witness_utxo = None;
  psbt.inputs[2].non_witness_utxo = None;
  assert!(matches!(
    verify_pof(&address, POF_P2TR_MESSAGE, psbt),
    Verification::Invalid(Error::ToSignInvalid)
  ));

  // the fallback rejects an earlier input's non_witness_utxo for a
  // different transaction (input 1 itself resolves via witness_utxo)
  let mut psbt = sign();
  let mut wrong_tx = prev_tx.clone();
  wrong_tx.version = Version(1);
  psbt.inputs[1].witness_utxo = Some(prev_tx.output[0].clone());
  psbt.inputs[1].non_witness_utxo = Some(wrong_tx);
  psbt.inputs[2].non_witness_utxo = None;
  assert!(matches!(
    verify_pof(&address, POF_P2TR_MESSAGE, psbt),
    Verification::Invalid(Error::ToSignInvalid)
  ));
}

#[test]
fn pof_duplicate_outpoint_is_rejected() {
  let address = Address::from_str(POF_P2TR_ADDRESS)
    .unwrap()
    .assume_checked();

  let proof_input = pof_p2tr_proof_input();
  assert!(sign_pof(
    &address,
    POF_P2TR_MESSAGE,
    &[PrivateKey::from_wif(POF_P2TR_CHALLENGE_KEY).unwrap()],
    None,
    &[proof_input.clone(), proof_input.clone()],
    LockParams::default(),
  )
  .is_err());

  let mut psbt = sign_pof(
    &address,
    POF_P2TR_MESSAGE,
    &[PrivateKey::from_wif(POF_P2TR_CHALLENGE_KEY).unwrap()],
    None,
    &[proof_input],
    LockParams::default(),
  )
  .unwrap();
  psbt
    .unsigned_tx
    .input
    .push(psbt.unsigned_tx.input[1].clone());
  psbt.inputs.push(psbt.inputs[1].clone());

  assert!(matches!(
    verify_pof(&address, POF_P2TR_MESSAGE, psbt),
    Verification::Invalid(Error::ToSignInvalid)
  ));
}

#[test]
fn pof_structure_and_utxo_rules_are_enforced() {
  let base = || pof_with_p2wpkh_challenge(&[pof_p2tr_proof_input()]);

  let (address, mut psbt) = base();
  psbt.unsigned_tx.input[1].previous_output = OutPoint::default();
  assert!(matches!(
    verify_pof(&address, POF_P2TR_MESSAGE, psbt),
    Verification::Invalid(Error::ToSignInvalid)
  ));

  let (address, mut psbt) = base();
  psbt.outputs.pop();
  assert!(matches!(
    verify_pof(&address, POF_P2TR_MESSAGE, psbt),
    Verification::Invalid(Error::ToSignInvalid)
  ));

  let (address, mut psbt) = base();
  psbt.unsigned_tx.output[0].script_pubkey = ScriptBuf::builder()
    .push_opcode(opcodes::all::OP_RETURN)
    .push_slice([1])
    .into_script();
  assert!(matches!(
    verify_pof(&address, POF_P2TR_MESSAGE, psbt),
    Verification::Invalid(Error::ToSignInvalid)
  ));

  let (address, mut psbt) = base();
  psbt.inputs[0].witness_utxo = None;
  assert!(matches!(
    verify_pof(&address, POF_P2TR_MESSAGE, psbt),
    Verification::Invalid(Error::ToSignInvalid)
  ));

  let legacy_address = Address::from_str(LEGACY_ADDRESS).unwrap().assume_checked();
  let mut legacy = sign_pof(
    &legacy_address,
    "foo",
    &[PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap()],
    None,
    &[pof_p2tr_proof_input()],
    LockParams::default(),
  )
  .unwrap();
  let to_spend = create_to_spend(&legacy_address, "foo");
  legacy.inputs[0].witness_utxo = Some(to_spend.output[0].clone());
  legacy.inputs[0].non_witness_utxo = None;
  assert!(matches!(
    verify_pof(&legacy_address, "foo", legacy),
    Verification::Invalid(Error::ToSignInvalid)
  ));
}

#[test]
fn transaction_weight_is_enforced_for_full_and_pof() {
  let (address, mut full) = full_p2wpkh_to_sign();
  full.input[0].witness.push(vec![0; 4_000_000]);
  assert!(matches!(
    verify_full(&address, "foo", full),
    Verification::Invalid(Error::ToSignInvalid)
  ));

  let (address, mut pof) = pof_with_p2wpkh_challenge(&[pof_p2tr_proof_input()]);
  pof.inputs[1]
    .final_script_witness
    .as_mut()
    .unwrap()
    .push(vec![0; 4_000_000]);
  assert!(matches!(
    verify_pof(&address, POF_P2TR_MESSAGE, pof),
    Verification::Invalid(Error::ToSignInvalid)
  ));
}

#[test]
fn excessive_pof_input_count_is_inconclusive() {
  fn encoded(psbt: &Psbt) -> String {
    format!(
      "{POF_SIGNATURE_PREFIX}{}",
      general_purpose::STANDARD.encode(psbt.serialize())
    )
  }

  let (address, mut psbt) = pof_with_p2wpkh_challenge(&[pof_p2tr_proof_input()]);
  for vout in 1..1024 {
    let mut txin = psbt.unsigned_tx.input[1].clone();
    txin.previous_output.vout = vout;
    psbt.unsigned_tx.input.push(txin);
    psbt.inputs.push(psbt.inputs[1].clone());
  }
  assert_eq!(psbt.unsigned_tx.input.len(), MAX_PROOF_INPUTS + 1);

  assert!(matches!(
    verify_pof_encoded(SEGWIT_ADDRESS, POF_P2TR_MESSAGE, &encoded(&psbt)),
    Verification::Inconclusive
  ));
  assert!(matches!(
    verify_pof(&address, POF_P2TR_MESSAGE, psbt.clone()),
    Verification::Inconclusive
  ));

  // The bound precedes every other check, so typed and encoded proofs agree
  // even when the proof is also malformed.
  psbt
    .unsigned_tx
    .output
    .push(psbt.unsigned_tx.output[0].clone());
  psbt.outputs.push(psbt.outputs[0].clone());
  assert!(matches!(
    verify_pof_encoded(SEGWIT_ADDRESS, POF_P2TR_MESSAGE, &encoded(&psbt)),
    Verification::Inconclusive
  ));
  assert!(matches!(
    verify_pof(&address, POF_P2TR_MESSAGE, psbt),
    Verification::Inconclusive
  ));
}

#[test]
fn encoded_pof_with_two_outputs_is_invalid() {
  let (address, mut psbt) = pof_with_p2wpkh_challenge(&[pof_p2tr_proof_input()]);
  psbt
    .unsigned_tx
    .output
    .push(psbt.unsigned_tx.output[0].clone());
  psbt.outputs.push(psbt.outputs[0].clone());

  let encoded = format!(
    "{POF_SIGNATURE_PREFIX}{}",
    general_purpose::STANDARD.encode(psbt.serialize())
  );
  assert!(matches!(
    verify_pof_encoded(&address.to_string(), POF_P2TR_MESSAGE, &encoded),
    Verification::Invalid(Error::ToSignInvalid)
  ));
  assert!(matches!(
    verify_pof(&address, POF_P2TR_MESSAGE, psbt),
    Verification::Invalid(Error::ToSignInvalid)
  ));
}

#[test]
fn producers_reject_excessive_pof_input_counts() {
  assert!(check_input_count(MAX_PROOF_INPUTS).is_ok());
  assert!(matches!(
    check_input_count(MAX_PROOF_INPUTS + 1),
    Err(Error::TooManyProofInputs { .. })
  ));

  let address = Address::from_str(SEGWIT_ADDRESS).unwrap().assume_checked();
  let inputs = vec![pof_p2tr_proof_input(); MAX_PROOF_INPUTS];

  assert!(matches!(
    create_bip322_psbt(&address, "foo", None, &inputs, LockParams::default()),
    Err(Error::TooManyProofInputs { .. })
  ));
  assert!(matches!(
    sign_pof(
      &address,
      "foo",
      &[PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap()],
      None,
      &inputs,
      LockParams::default(),
    ),
    Err(Error::TooManyProofInputs { .. })
  ));

  let (_, mut psbt) = pof_with_p2wpkh_challenge(&[pof_p2tr_proof_input()]);
  while psbt.unsigned_tx.input.len() <= MAX_PROOF_INPUTS {
    let mut txin = psbt.unsigned_tx.input[1].clone();
    txin.previous_output.vout = psbt.unsigned_tx.input.len() as u32;
    psbt.unsigned_tx.input.push(txin);
    psbt.inputs.push(psbt.inputs[1].clone());
  }
  assert!(matches!(
    finalize_bip322_psbt(psbt),
    Err(Error::TooManyProofInputs { .. })
  ));
}

#[test]
fn pof_required_failure_precedes_earlier_inconclusive_input() {
  let second = ProofInput {
    outpoint: OutPoint {
      txid: "2222222222222222222222222222222222222222222222222222222222222222"
        .parse()
        .unwrap(),
      vout: 0,
    },
    ..pof_p2tr_proof_input()
  };
  let (address, mut psbt) = pof_with_p2wpkh_challenge(&[pof_p2tr_proof_input(), second]);
  psbt.inputs[1].witness_utxo.as_mut().unwrap().script_pubkey =
    ScriptBuf::from_hex("52200000000000000000000000000000000000000000000000000000000000000000")
      .unwrap();
  let mut tampered = psbt.inputs[2]
    .final_script_witness
    .as_ref()
    .unwrap()
    .to_vec();
  tampered[0][0] ^= 1;
  psbt.inputs[2].final_script_witness = Some(Witness::from_slice(&tampered));

  assert!(matches!(
    verify_pof(&address, POF_P2TR_MESSAGE, psbt),
    Verification::Invalid(Error::SignatureInvalid { .. })
  ));
}

#[test]
fn conflicting_utxo_fields_are_rejected() {
  let (address, psbt) = pof_with_bare_proof_input(ScriptBuf::from_bytes(vec![
    opcodes::all::OP_PUSHNUM_1.to_u8(),
  ]));
  assert_valid(verify_pof(&address, POF_P2TR_MESSAGE, psbt.clone()));

  // The proof input's witness_utxo disagrees with its previous transaction.
  let mut conflicting = psbt;
  let prevout = conflicting.inputs[1]
    .non_witness_utxo
    .as_ref()
    .unwrap()
    .output[0]
    .clone();
  conflicting.inputs[1].witness_utxo = Some(TxOut {
    value: prevout.value + Amount::from_sat(1),
    ..prevout
  });

  assert!(matches!(
    verify_pof(&address, POF_P2TR_MESSAGE, conflicting.clone()),
    Verification::Invalid(Error::ToSignInvalid)
  ));
  assert!(matches!(
    sign_bip322_psbt_input(
      &mut conflicting.clone(),
      &PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap(),
      0
    ),
    Err(Error::ToSignInvalid)
  ));
  assert!(matches!(
    finalize_bip322_psbt(conflicting),
    Err(Error::ToSignInvalid)
  ));
}

#[test]
fn producers_validate_legacy_proof_input_utxo_data() {
  let private_key = PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap();
  let prev_tx = Transaction {
    version: Version(2),
    lock_time: LockTime::ZERO,
    input: vec![TxIn::default()],
    output: vec![TxOut {
      value: Amount::from_sat(345678),
      script_pubkey: ScriptBuf::new_p2pkh(&private_key.public_key(&Secp256k1::new()).pubkey_hash()),
    }],
  };
  let valid = ProofInput {
    outpoint: OutPoint {
      txid: prev_tx.compute_txid(),
      vout: 0,
    },
    prevout: prev_tx.output[0].clone(),
    prev_tx: Some(prev_tx),
    private_keys: vec![private_key],
    witness_script: None,
  };
  let address = Address::from_str(SEGWIT_ADDRESS).unwrap().assume_checked();
  let create =
    |input: ProofInput| create_bip322_psbt(&address, "foo", None, &[input], LockParams::default());
  assert!(create(valid.clone()).is_ok());

  for (input, expected) in [
    (
      ProofInput {
        prev_tx: None,
        ..valid.clone()
      },
      "legacy input requires prev_tx",
    ),
    (
      ProofInput {
        outpoint: OutPoint {
          txid: bitcoin::Txid::from_byte_array([1; 32]),
          vout: 0,
        },
        ..valid.clone()
      },
      "prev_tx txid does not match outpoint",
    ),
    (
      ProofInput {
        outpoint: OutPoint {
          vout: 1,
          ..valid.outpoint
        },
        ..valid.clone()
      },
      "outpoint vout exceeds prev_tx outputs",
    ),
    (
      ProofInput {
        prevout: TxOut {
          value: Amount::from_sat(1),
          ..valid.prevout.clone()
        },
        ..valid.clone()
      },
      "prevout does not match prev_tx output",
    ),
  ] {
    let result = create(input);
    assert!(
      matches!(&result, Err(Error::InvalidProofInput { index: 0, reason }) if reason == expected),
      "{expected}: got {result:?}"
    );
  }
}
