use super::fixtures::*;
use super::*;
use crate::verify::preflight;

/// A bare hashlock, which miniscript cannot express, so the interpreter
/// leaves any spend of it inconclusive unless a structural rule rejects it
/// first.
fn inexpressible_script() -> ScriptBuf {
  ScriptBuf::builder()
    .push_opcode(opcodes::all::OP_SHA256)
    .push_slice([7; 32])
    .push_opcode(opcodes::all::OP_EQUAL)
    .into_script()
}

/// Verifies a full P2WSH proof whose witness is `witness`.
fn verify_p2wsh(witness_script: &ScriptBuf, witness: Witness) -> Verification {
  let address = Address::p2wsh(witness_script, bitcoin::Network::Bitcoin);
  let mut to_sign = create_to_sign(
    &create_to_spend(&address, "foo"),
    None,
    LockParams::default(),
  )
  .unsigned_tx;
  to_sign.input[0].witness = witness;
  verify_full(&address, "foo", to_sign)
}

/// Verifies a full P2TR script-path proof of `tapscript` whose initial
/// stack is `stack`.
fn verify_tapscript(tapscript: &ScriptBuf, stack: Vec<Vec<u8>>) -> Verification {
  let private_key = PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap();
  let (address, mut to_sign, _signature, control_block) =
    p2tr_script_path_spend(tapscript, &private_key, TapSighashType::Default);
  let mut witness = Witness::new();
  for item in stack {
    witness.push(item);
  }
  witness.push(tapscript.as_bytes());
  witness.push(control_block);
  to_sign.input[0].witness = witness;
  verify_full(&address, "foo", to_sign)
}

/// A witness of `count` empty items followed by `tail`, decoded from its
/// encoding because pushing items one by one is quadratic.
fn witness_with_empty_items(count: usize, tail: &[&[u8]]) -> Witness {
  let mut bytes = Vec::new();
  bitcoin::consensus::encode::VarInt((count + tail.len()) as u64)
    .consensus_encode(&mut bytes)
    .unwrap();
  bytes.resize(bytes.len() + count, 0);
  for item in tail {
    bitcoin::consensus::encode::VarInt(item.len() as u64)
      .consensus_encode(&mut bytes)
      .unwrap();
    bytes.extend_from_slice(item);
  }
  bitcoin::consensus::deserialize(&bytes).unwrap()
}

#[test]
fn v0_witness_stack_is_limited_to_1000_items() {
  let witness_script = inexpressible_script();

  assert!(matches!(
    verify_p2wsh(
      &witness_script,
      witness_with_empty_items(1000, &[witness_script.as_bytes()])
    ),
    Verification::Inconclusive
  ));
  assert!(matches!(
    verify_p2wsh(
      &witness_script,
      witness_with_empty_items(1001, &[witness_script.as_bytes()])
    ),
    Verification::Invalid(Error::InvalidWitness)
  ));
}

#[test]
fn v0_witness_items_are_limited_to_520_bytes() {
  let witness_script = inexpressible_script();

  assert!(matches!(
    verify_p2wsh(
      &witness_script,
      Witness::from_slice(&[vec![0; 520], witness_script.to_bytes()])
    ),
    Verification::Inconclusive
  ));
  assert!(matches!(
    verify_p2wsh(
      &witness_script,
      Witness::from_slice(&[vec![0; 521], witness_script.to_bytes()])
    ),
    Verification::Invalid(Error::InvalidWitness)
  ));

  // The same limit applies to P2WPKH, before the oversized key is parsed.
  let (address, mut to_sign) = full_p2wpkh_to_sign();
  let signature = to_sign.input[0].witness.nth(0).unwrap().to_vec();
  to_sign.input[0].witness = Witness::from_slice(&[signature, vec![2; 521]]);
  assert!(matches!(
    verify_full(&address, "foo", to_sign),
    Verification::Invalid(Error::InvalidWitness)
  ));
}

#[test]
fn tapscript_stack_limits_yield_to_op_success() {
  let empty = ScriptBuf::new();
  let op_success = ScriptBuf::from_bytes(vec![0x50]);

  // An empty tapscript requires a single true item, so a stack that passes
  // the limits fails the script instead.
  assert!(matches!(
    verify_tapscript(&empty, vec![vec![1]; 1000]),
    Verification::Invalid(Error::ScriptNotSatisfied)
  ));
  assert!(matches!(
    verify_tapscript(&empty, vec![vec![1]; 1001]),
    Verification::Invalid(Error::InvalidWitness)
  ));
  assert!(matches!(
    verify_tapscript(&op_success, vec![vec![1]; 1001]),
    Verification::Inconclusive
  ));

  assert_valid(verify_tapscript(&empty, vec![vec![1; 520]]));
  assert!(matches!(
    verify_tapscript(&empty, vec![vec![1; 521]]),
    Verification::Invalid(Error::InvalidWitness)
  ));
  assert!(matches!(
    verify_tapscript(&op_success, vec![vec![1; 521]]),
    Verification::Inconclusive
  ));
}

#[test]
fn scripts_are_limited_to_10000_bytes() {
  // A scriptSig of a well-formed push of the key and an oversized "signature"
  // fails at the signature, unless it exceeds the script size limit first.
  let address = Address::from_str(LEGACY_ADDRESS).unwrap().assume_checked();
  let public_key = PrivateKey::from_wif(WIF_PRIVATE_KEY)
    .unwrap()
    .public_key(&Secp256k1::new());
  let verify_script_sig = |length: usize| {
    let mut signature = vec![0; length - 37];
    *signature.last_mut().unwrap() = EcdsaSighashType::All as u8;
    let mut to_sign = create_to_sign(
      &create_to_spend(&address, "foo"),
      None,
      LockParams::default(),
    )
    .unsigned_tx;
    to_sign.input[0].script_sig = ScriptBuf::builder()
      .push_slice(push_bytes(&signature))
      .push_key(&public_key)
      .into_script();
    assert_eq!(to_sign.input[0].script_sig.len(), length);
    verify_full(&address, "foo", to_sign)
  };
  assert!(matches!(
    verify_script_sig(10_000),
    Verification::Invalid(Error::SignatureInvalid { .. })
  ));
  assert!(matches!(
    verify_script_sig(10_001),
    Verification::Invalid(Error::InvalidWitness)
  ));

  let verify_witness_script = |length: usize| {
    let witness_script = ScriptBuf::from_bytes(vec![opcodes::all::OP_PUSHNUM_1.to_u8(); length]);
    verify_p2wsh(
      &witness_script,
      Witness::from_slice(&[witness_script.as_bytes()]),
    )
  };
  assert!(matches!(
    verify_witness_script(10_000),
    Verification::Inconclusive
  ));
  assert!(matches!(
    verify_witness_script(10_001),
    Verification::Invalid(Error::InvalidWitness)
  ));
}

#[test]
fn huge_witness_stacks_are_rejected_without_materializing() {
  // Just under the weight limit, which to_sign must also satisfy.
  const ITEMS: usize = 3_999_000;

  let witness_script = inexpressible_script();
  let witness = witness_with_empty_items(ITEMS, &[witness_script.as_bytes()]);
  assert!(matches!(
    verify_p2wsh(&witness_script, witness),
    Verification::Invalid(Error::InvalidWitness)
  ));

  let private_key = PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap();
  let tapscript = single_key_tapscript(&private_key);
  let (address, mut to_sign, _signature, control_block) =
    p2tr_script_path_spend(&tapscript, &private_key, TapSighashType::Default);
  to_sign.input[0].witness =
    witness_with_empty_items(ITEMS, &[tapscript.as_bytes(), &control_block]);
  assert!(to_sign.weight() <= bitcoin::Weight::MAX_BLOCK);
  assert!(matches!(
    verify_full(&address, "foo", to_sign),
    Verification::Invalid(Error::InvalidWitness)
  ));
}

#[test]
fn encoded_witnesses_reject_more_than_max_witness_items() {
  let excessive = witness_with_empty_items(MAX_WITNESS_ITEMS + 1, &[]);
  let mut witness_bytes = Vec::new();
  excessive.consensus_encode(&mut witness_bytes).unwrap();

  let v0 = Address::from_str(SEGWIT_ADDRESS).unwrap().assume_checked();
  let simple = format!(
    "{SIMPLE_SIGNATURE_PREFIX}{}",
    general_purpose::STANDARD.encode(&witness_bytes)
  );
  assert!(matches!(
    verify_simple_encoded(&v0.to_string(), "foo", &simple),
    Verification::Invalid(Error::InvalidWitness)
  ));

  let mut to_sign =
    create_to_sign(&create_to_spend(&v0, "foo"), None, LockParams::default()).unsigned_tx;
  to_sign.input[0].witness = excessive.clone();
  let mut transaction_bytes = Vec::new();
  to_sign.consensus_encode(&mut transaction_bytes).unwrap();
  let full = format!(
    "{FULL_SIGNATURE_PREFIX}{}",
    general_purpose::STANDARD.encode(&transaction_bytes)
  );
  assert!(matches!(
    verify_full_encoded(&v0.to_string(), "foo", &full),
    Verification::Invalid(Error::ToSignInvalid)
  ));

  // A V1 witness over the item limit may be valid under an upgradeable
  // rule, so it must remain inconclusive rather than become invalid.
  let v1 = Address::from_str(TAPROOT_ADDRESS).unwrap().assume_checked();
  let simple = format!(
    "{SIMPLE_SIGNATURE_PREFIX}{}",
    general_purpose::STANDARD.encode(&witness_bytes)
  );
  assert!(matches!(
    verify_simple_encoded(&v1.to_string(), "foo", &simple),
    Verification::Inconclusive
  ));

  let mut to_sign =
    create_to_sign(&create_to_spend(&v1, "foo"), None, LockParams::default()).unsigned_tx;
  to_sign.input[0].witness = excessive;
  let mut transaction_bytes = Vec::new();
  to_sign.consensus_encode(&mut transaction_bytes).unwrap();
  let full = format!(
    "{FULL_SIGNATURE_PREFIX}{}",
    general_purpose::STANDARD.encode(&transaction_bytes)
  );
  assert!(matches!(
    verify_full_encoded(&v1.to_string(), "foo", &full),
    Verification::Inconclusive
  ));
}

#[test]
fn encoded_upgradeable_taproot_witnesses_are_inconclusive() {
  let private_key = PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap();
  let success_script = ScriptBuf::from_bytes(vec![0x50]);
  let (address, mut to_sign, _signature, control_block) =
    p2tr_script_path_spend(&success_script, &private_key, TapSighashType::Default);
  let witness = witness_with_empty_items(
    MAX_WITNESS_ITEMS - 1,
    &[success_script.as_bytes(), &control_block],
  );
  assert_eq!(witness.len(), MAX_WITNESS_ITEMS + 1);

  let mut witness_bytes = Vec::new();
  witness.consensus_encode(&mut witness_bytes).unwrap();
  let simple = format!(
    "{SIMPLE_SIGNATURE_PREFIX}{}",
    general_purpose::STANDARD.encode(&witness_bytes)
  );
  assert!(matches!(
    verify_simple_encoded(&address.to_string(), "foo", &simple),
    Verification::Inconclusive
  ));

  to_sign.input[0].witness = witness;
  assert!(matches!(
    verify_full(&address, "foo", to_sign.clone()),
    Verification::Inconclusive
  ));
  let mut transaction_bytes = Vec::new();
  to_sign.consensus_encode(&mut transaction_bytes).unwrap();
  let full = format!(
    "{FULL_SIGNATURE_PREFIX}{}",
    general_purpose::STANDARD.encode(&transaction_bytes)
  );
  assert!(matches!(
    verify_full_encoded(&address.to_string(), "foo", &full),
    Verification::Inconclusive
  ));
}

#[test]
fn encoded_unknown_leaf_version_over_the_item_limit_is_inconclusive() {
  let secp = Secp256k1::new();
  let internal_key = PrivateKey::from_wif(NESTED_SEGWIT_WIF_PRIVATE_KEY)
    .unwrap()
    .public_key(&secp)
    .inner
    .x_only_public_key()
    .0;
  let tapscript = ScriptBuf::from_bytes(vec![0x51]);
  let leaf_version = bitcoin::taproot::LeafVersion::from_consensus(0xc2).unwrap();
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
    .unwrap()
    .serialize();
  let witness = witness_with_empty_items(
    MAX_WITNESS_ITEMS - 1,
    &[tapscript.as_bytes(), &control_block],
  );

  let mut witness_bytes = Vec::new();
  witness.consensus_encode(&mut witness_bytes).unwrap();
  let simple = format!(
    "{SIMPLE_SIGNATURE_PREFIX}{}",
    general_purpose::STANDARD.encode(&witness_bytes)
  );
  assert!(matches!(
    verify_simple_encoded(&address.to_string(), "foo", &simple),
    Verification::Inconclusive
  ));

  let mut to_sign = create_to_sign(
    &create_to_spend(&address, "foo"),
    None,
    LockParams::default(),
  )
  .unsigned_tx;
  to_sign.input[0].witness = witness;
  assert!(matches!(
    verify_full(&address, "foo", to_sign.clone()),
    Verification::Inconclusive
  ));
  let mut transaction_bytes = Vec::new();
  to_sign.consensus_encode(&mut transaction_bytes).unwrap();
  let full = format!(
    "{FULL_SIGNATURE_PREFIX}{}",
    general_purpose::STANDARD.encode(&transaction_bytes)
  );
  assert!(matches!(
    verify_full_encoded(&address.to_string(), "foo", &full),
    Verification::Inconclusive
  ));
}

#[test]
fn encoded_unknown_v1_witnesses_are_inconclusive() {
  let program = bitcoin::WitnessProgram::new(bitcoin::WitnessVersion::V1, &[0x4e, 0x73]).unwrap();
  let address = Address::from_witness_program(program, bitcoin::Network::Bitcoin);
  let witness = witness_with_empty_items(MAX_WITNESS_ITEMS + 1, &[]);

  let mut witness_bytes = Vec::new();
  witness.consensus_encode(&mut witness_bytes).unwrap();
  let simple = format!(
    "{SIMPLE_SIGNATURE_PREFIX}{}",
    general_purpose::STANDARD.encode(&witness_bytes)
  );
  assert!(matches!(
    verify_simple_encoded(&address.to_string(), "foo", &simple),
    Verification::Inconclusive
  ));

  let mut to_sign = create_to_sign(
    &create_to_spend(&address, "foo"),
    None,
    LockParams::default(),
  )
  .unsigned_tx;
  to_sign.input[0].witness = witness;
  let mut transaction_bytes = Vec::new();
  to_sign.consensus_encode(&mut transaction_bytes).unwrap();
  let full = format!(
    "{FULL_SIGNATURE_PREFIX}{}",
    general_purpose::STANDARD.encode(&transaction_bytes)
  );
  assert!(matches!(
    verify_full_encoded(&address.to_string(), "foo", &full),
    Verification::Inconclusive
  ));
}

#[test]
fn encoded_p2sh_witnesses_over_the_item_limit_are_inconclusive() {
  let address = Address::from_str(P2SH_MULTISIG_2OF2_ADDRESS)
    .unwrap()
    .assume_checked();
  let witness = witness_with_empty_items(MAX_WITNESS_ITEMS + 1, &[]);

  let mut witness_bytes = Vec::new();
  witness.consensus_encode(&mut witness_bytes).unwrap();
  let simple = format!(
    "{SIMPLE_SIGNATURE_PREFIX}{}",
    general_purpose::STANDARD.encode(&witness_bytes)
  );
  // Simple proofs are restricted to native segwit, so this is rejected
  // before the witness is decoded.
  assert!(matches!(
    verify_simple_encoded(&address.to_string(), "foo", &simple),
    Verification::Invalid(Error::SimpleFormatUnsupported { .. })
  ));

  let mut to_sign = create_to_sign(
    &create_to_spend(&address, "foo"),
    None,
    LockParams::default(),
  )
  .unsigned_tx;
  to_sign.input[0].witness = witness;
  let mut transaction_bytes = Vec::new();
  to_sign.consensus_encode(&mut transaction_bytes).unwrap();
  let full = format!(
    "{FULL_SIGNATURE_PREFIX}{}",
    general_purpose::STANDARD.encode(&transaction_bytes)
  );
  // The nested script version is unknown before decoding, so over the local
  // item limit the safe verdict is inconclusive.
  assert!(matches!(
    verify_full_encoded(&address.to_string(), "foo", &full),
    Verification::Inconclusive
  ));
}

#[test]
fn encoded_psbt_non_witness_utxo_over_the_item_limit_is_inconclusive() {
  let (address, mut psbt) =
    pof_with_bare_proof_input(ScriptBuf::new_p2pkh(&bitcoin::PubkeyHash::all_zeros()));
  let prev_tx = psbt.inputs[1].non_witness_utxo.as_mut().unwrap();
  prev_tx.input[0].witness = witness_with_empty_items(MAX_WITNESS_ITEMS + 1, &[]);

  let encoded = format!(
    "{POF_SIGNATURE_PREFIX}{}",
    general_purpose::STANDARD.encode(psbt.serialize())
  );
  assert!(matches!(
    verify_pof_encoded(&address.to_string(), POF_P2TR_MESSAGE, &encoded),
    Verification::Inconclusive
  ));
}

#[test]
fn witness_item_limit_boundaries_are_inclusive() {
  let at_limit = witness_with_empty_items(MAX_WITNESS_ITEMS, &[]);
  let mut bytes = Vec::new();
  at_limit.consensus_encode(&mut bytes).unwrap();
  assert_eq!(
    preflight::witness_with_limit(&bytes, Some(MAX_WITNESS_ITEMS)),
    preflight::Check::Valid(())
  );

  let over_limit = witness_with_empty_items(MAX_WITNESS_ITEMS + 1, &[]);
  let mut bytes = Vec::new();
  over_limit.consensus_encode(&mut bytes).unwrap();
  assert_eq!(
    preflight::witness_with_limit(&bytes, Some(MAX_WITNESS_ITEMS)),
    preflight::Check::OverLimit
  );

  let witness_script = inexpressible_script();
  let address = Address::p2wsh(&witness_script, bitcoin::Network::Bitcoin);
  let witness = witness_with_empty_items(MAX_STACK_SIZE, &[witness_script.as_bytes()]);
  assert_eq!(witness.len(), MAX_STACK_SIZE + 1);
  let mut bytes = Vec::new();
  witness.consensus_encode(&mut bytes).unwrap();
  let encoded = format!(
    "{SIMPLE_SIGNATURE_PREFIX}{}",
    general_purpose::STANDARD.encode(&bytes)
  );
  assert!(matches!(
    verify_simple_encoded(&address.to_string(), "foo", &encoded),
    Verification::Inconclusive
  ));
}

#[test]
fn future_witness_versions_stay_inconclusive_over_the_item_limit() {
  let program = bitcoin::WitnessProgram::new(bitcoin::WitnessVersion::V2, &[7; 32]).unwrap();
  let address = Address::from_witness_program(program, bitcoin::Network::Bitcoin);
  let witness = witness_with_empty_items(MAX_WITNESS_ITEMS + 1, &[]);

  let mut witness_bytes = Vec::new();
  witness.consensus_encode(&mut witness_bytes).unwrap();
  let simple = format!(
    "{SIMPLE_SIGNATURE_PREFIX}{}",
    general_purpose::STANDARD.encode(&witness_bytes)
  );
  assert!(matches!(
    verify_simple_encoded(&address.to_string(), "foo", &simple),
    Verification::Inconclusive
  ));

  let mut to_sign = create_to_sign(
    &create_to_spend(&address, "foo"),
    None,
    LockParams::default(),
  )
  .unsigned_tx;
  to_sign.input[0].witness = witness;
  let mut transaction_bytes = Vec::new();
  to_sign.consensus_encode(&mut transaction_bytes).unwrap();
  let full = format!(
    "{FULL_SIGNATURE_PREFIX}{}",
    general_purpose::STANDARD.encode(&transaction_bytes)
  );
  assert!(matches!(
    verify_full_encoded(&address.to_string(), "foo", &full),
    Verification::Inconclusive
  ));
}

#[test]
fn psbt_final_witnesses_stay_inconclusive_over_the_item_limit() {
  let program = bitcoin::WitnessProgram::new(bitcoin::WitnessVersion::V2, &[7; 32]).unwrap();
  let script_pubkey =
    Address::from_witness_program(program, bitcoin::Network::Bitcoin).script_pubkey();
  let (address, mut psbt) = pof_with_bare_proof_input(script_pubkey);
  psbt.inputs[1].final_script_witness = Some(witness_with_empty_items(MAX_WITNESS_ITEMS + 1, &[]));

  let encoded = format!(
    "{POF_SIGNATURE_PREFIX}{}",
    general_purpose::STANDARD.encode(psbt.serialize())
  );
  assert!(matches!(
    verify_pof_encoded(&address.to_string(), POF_P2TR_MESSAGE, &encoded),
    Verification::Inconclusive
  ));
}

#[test]
fn p2sh_stack_is_limited_to_1000_items_of_520_bytes() {
  let redeem_script = inexpressible_script();
  let address = Address::p2sh(&redeem_script, bitcoin::Network::Bitcoin).unwrap();
  let verify = |stack: &[Vec<u8>]| {
    let mut to_sign = create_to_sign(
      &create_to_spend(&address, "foo"),
      None,
      LockParams::default(),
    )
    .unsigned_tx;
    to_sign.input[0].script_sig = stack
      .iter()
      .fold(ScriptBuf::builder(), |builder, item| {
        builder.push_slice(push_bytes(item))
      })
      .push_slice(push_bytes(redeem_script.as_bytes()))
      .into_script();
    verify_full(&address, "foo", to_sign)
  };

  // The redeem script itself is the last of the scriptSig's stack items.
  assert!(matches!(
    verify(&vec![Vec::new(); 999]),
    Verification::Inconclusive
  ));
  assert!(matches!(
    verify(&vec![Vec::new(); 1000]),
    Verification::Invalid(Error::InvalidWitness)
  ));

  assert!(matches!(
    verify(&[vec![0; 520]]),
    Verification::Inconclusive
  ));
  assert!(matches!(
    verify(&[vec![0; 521]]),
    Verification::Invalid(Error::InvalidWitness)
  ));
}
