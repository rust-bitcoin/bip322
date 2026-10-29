use super::*;

/// Asserts a verify call reported the proof valid.
#[track_caller]
pub(crate) fn assert_valid(result: Verification) {
  assert!(result.is_valid(), "got {result:?}");
}

pub(crate) const WIF_PRIVATE_KEY: &str = "L3VFeEujGtevx9w18HD1fhRbCH67Az2dpCymeRE1SoPK6XQtaN2k";

pub(crate) const SEGWIT_ADDRESS: &str = "bc1q9vza2e8x573nczrlzms0wvx3gsqjx7vavgkx0l";

pub(crate) const TAPROOT_ADDRESS: &str =
  "bc1ppv609nr0vr25u07u95waq5lucwfm6tde4nydujnu8npg4q75mr5sxq8lt3";

pub(crate) const LEGACY_ADDRESS: &str = "14vV3aCHBeStb5bkenkNHbe2YAFinYdXgc";

pub(crate) const NESTED_SEGWIT_WIF_PRIVATE_KEY: &str =
  "KwTbAxmBXjoZM3bzbXixEr9nxLhyYSM4vp2swet58i19bw9sqk5z";

pub(crate) const NESTED_SEGWIT_ADDRESS: &str = "3HSVzEhCFuH9Z3wvoWTexy7BMVVp3PjS6f";

pub(crate) const P2WSH_2OF2_ADDRESS: &str =
  "bc1qg8r3cl47rrr75dwvr7jhzdukptegnmq8v0nmjd2jdn4qvlczqkts0rqtav";

pub(crate) const P2WSH_2OF2_WITNESS_SCRIPT: &str =
  "52210244f7cb842a4ce4f352ce4062ae5e0a5d60d6faa0b07b62c2063484aa5297bbce210234eed6190efc47716b953a050b563f8b2b523addea955ae43351dd2a92aa49f452ae";

pub(crate) const P2WSH_2OF2_PRIVATE_KEY_1: &str =
  "L14bn1tSDZUKYLLiTConCRHbqzGef8eqB2tU5PBPFBkyPLUyob7V";

pub(crate) const P2WSH_2OF2_PRIVATE_KEY_2: &str =
  "KyJnWYygb7P2P8khWyDMW9yFGA3dUe7kpkEHtLbzY6cfvvn9T5CS";

pub(crate) const P2WSH_2OF2_MESSAGE: &str = "QXYOWYWO7ZGJC4OPNC367HBUQF";

pub(crate) const P2SH_P2WSH_2OF2_ADDRESS: &str = "3PGZjFkYBL1m9WBWkWbCW5FEFTaS1Hj4EB";

pub(crate) const P2SH_P2WSH_2OF2_WITNESS_SCRIPT: &str =
  "522103fb824153fc000a213c5456d01780d1f292a0cfbfbc5f6f8f1dc713706c5519d12103db88ce9fb8081e50460beb37539741b0667d6f2439dd1ca283d63182421c10b152ae";

pub(crate) const P2SH_P2WSH_2OF2_PRIVATE_KEY_1: &str =
  "L246N8J5x5ehwjoz97ZfHXBCELxGcK2jqRFinReMBcRnqH1X4zdc";

pub(crate) const P2SH_P2WSH_2OF2_PRIVATE_KEY_2: &str =
  "L1WzdMN476EHhwsDLHJwVHZKrwVLFFsdvNoZFsZVk2Mb5rKst2Et";

pub(crate) const P2SH_P2WSH_2OF2_MESSAGE: &str = "NQVRV3DJYLKBANM3OPTNBULEU3";

pub(crate) const UNCOMPRESSED_WIF_PRIVATE_KEY: &str =
  "5HpHagT65TZzG1PH3CSu63k8DbpvD8s5ip4nEB3kEsreAnchuDf";

pub(crate) const P2SH_MULTISIG_2OF2_ADDRESS: &str = "3Nye4j1GUFqCEBR3do2KEFZAs9oLe8NZ6X";

pub(crate) const P2SH_MULTISIG_2OF2_REDEEM_SCRIPT: &str =
  "52210384a8dc6ff3efd7fec062eb73397c2079cd3cc300ff57088f9b9f0b734c63a21821021c9c8e9c1d06e3f7de8ad05c01f5080b2b81292eb29c4cdbe14f43838256141652ae";

pub(crate) const P2SH_MULTISIG_2OF2_PRIVATE_KEY_1: &str =
  "L5Teubyzf4mFSMHGCzADK42oRi9xz45qhBrYx2Xs8uCY6WyrymT5";

pub(crate) const P2SH_MULTISIG_2OF2_PRIVATE_KEY_2: &str =
  "L4HsBh1Rb5DWP5Hf82tPw3whgwFyt8hdRTChxZQE4HzWfdbVgiWT";

pub(crate) const POF_P2TR_ADDRESS: &str =
  "bc1pk3vq3wpn4txexwq4dj0k2dugzp6kfwllvs89w49cvtk3j2cndcds3l9kw9";

pub(crate) const POF_P2TR_CHALLENGE_KEY: &str =
  "L1p7QRghEregYbBvSCp1eW4YJg2RwMYwX2uhR1eAnkVoPJBaJ7Dy";

pub(crate) const POF_P2TR_PROVEN_KEY_1: &str =
  "Kz5jBiqQKoppYvaxtWZJicxGZ3G3iJ4rLqNnv7MaQBusyoE731EJ";

pub(crate) const POF_P2TR_PROVEN_KEY_2: &str =
  "L2fNJduiUkSytUDbxa58ivWoHevB3svcWUJMxMFebdugYP5jgJr1";

pub(crate) const POF_P2TR_PROVEN_KEY_3: &str =
  "KxqVMn81AEYSwYuzBxe6xC4JDAgA2eU2qiNvBAgVZZwRFv1BqN3y";

pub(crate) const POF_P2TR_MESSAGE: &str = "FUYMQWKYGS7HJEN7YFEZU5SNR5";

pub(crate) const NO_PREFIX_ADDRESS: &str =
  "bc1pss0zhytly75awhm6x2hhvd5lnzv3vssgrf9axfheq8ldyzn88ges79fler";

pub(crate) const NO_PREFIX_MESSAGE: &str = "No prefix fallback";

pub(crate) const NO_PREFIX_SIGNATURE: &str =
  "AUCJYOwOjxYAvatTAGYaVlNXBVyFuc4MwNQkOuK2tl8xhfKDONd0NjfYyNSYcRqeCp8hsAnCEPHAVEkO9h6vbQ/R";

pub(crate) const INCORRECT_PREFIX_ADDRESS: &str =
  "bc1pyrgrm6cu6n54jrvkdjd9rvyd3xfyu84s2623awu2srn6mxhscwpsm5644w";

pub(crate) const INCORRECT_PREFIX_MESSAGE: &str = "incorrect prefix";

pub(crate) const INCORRECT_PREFIX_SIGNATURE: &str =
  "fulAUDZwFXUp+adN+/UZj5dVrGAbB3zKs1Vcalz5fCF9srxS63eSWNGvH1NYbrBkPt1BJDUyWUz9zgUxfc63/QheT6M";

pub(crate) fn full_p2wpkh_to_sign() -> (Address, Transaction) {
  let address = Address::from_str(SEGWIT_ADDRESS).unwrap().assume_checked();

  let to_sign = crate::sign::sign_full(
    &address,
    "foo",
    &[PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap()],
    None,
    LockParams::default(),
  )
  .unwrap();

  (address, to_sign)
}

pub(crate) fn p2wsh_2of2_witness(address: &Address) -> Witness {
  crate::sign::sign_simple(
    address,
    P2WSH_2OF2_MESSAGE,
    &[
      PrivateKey::from_wif(P2WSH_2OF2_PRIVATE_KEY_1).unwrap(),
      PrivateKey::from_wif(P2WSH_2OF2_PRIVATE_KEY_2).unwrap(),
    ],
    Some(&ScriptBuf::from_hex(P2WSH_2OF2_WITNESS_SCRIPT).unwrap()),
  )
  .unwrap()
}

pub(crate) fn pof_p2tr_proof_input() -> ProofInput {
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
  }
}

pub(crate) fn pof_with_p2wpkh_challenge(proof_inputs: &[ProofInput]) -> (Address, Psbt) {
  let address = Address::from_str(SEGWIT_ADDRESS).unwrap().assume_checked();
  let psbt = sign_pof(
    &address,
    POF_P2TR_MESSAGE,
    &[PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap()],
    None,
    proof_inputs,
    LockParams::default(),
  )
  .unwrap();

  (address, psbt)
}

pub(crate) fn supply_legacy_non_witness_utxo(psbt: &mut Psbt, index: usize) {
  let prevout = psbt.inputs[index].witness_utxo.clone().unwrap();
  let prev_tx = Transaction {
    version: Version(0),
    lock_time: LockTime::ZERO,
    input: vec![TxIn::default()],
    output: vec![prevout],
  };
  psbt.unsigned_tx.input[index].previous_output = OutPoint {
    txid: prev_tx.compute_txid(),
    vout: 0,
  };
  psbt.inputs[index].non_witness_utxo = Some(prev_tx);
}

pub(crate) fn non_minimal_one_of_one_multisig(public_key: &PublicKey) -> ScriptBuf {
  let mut script = vec![
    opcodes::all::OP_PUSHNUM_1.to_u8(),
    opcodes::all::OP_PUSHDATA1.to_u8(),
    33,
  ];
  script.extend_from_slice(&public_key.to_bytes());
  script.extend_from_slice(&[
    opcodes::all::OP_PUSHNUM_1.to_u8(),
    opcodes::all::OP_CHECKMULTISIG.to_u8(),
  ]);
  ScriptBuf::from_bytes(script)
}

/// Builds a P2WSH spend of `witness_script`, signing with `private_key` over the BIP-143 sighash.
pub(crate) fn p2wsh_interpreter_spend(
  witness_script: &ScriptBuf,
  private_key: &PrivateKey,
  sighash_type: EcdsaSighashType,
  locks: LockParams,
) -> (Address, Transaction, bitcoin::ecdsa::Signature) {
  let secp = Secp256k1::new();
  let address = Address::p2wsh(witness_script, bitcoin::Network::Bitcoin);

  let to_spend = create_to_spend(&address, "foo");
  let psbt = create_to_sign(&to_spend, None, locks);

  let sighash = SighashCache::new(psbt.unsigned_tx.clone())
    .p2wsh_signature_hash(0, witness_script, Amount::ZERO, sighash_type)
    .unwrap();

  let signature = bitcoin::ecdsa::Signature {
    signature: secp.sign_ecdsa(
      &secp256k1::Message::from_digest_slice(sighash.as_ref()).unwrap(),
      &private_key.inner,
    ),
    sighash_type,
  };

  (address, psbt.unsigned_tx, signature)
}

/// Builds a P2TR script-path spend of `tapscript`, signing with
/// `private_key` over the BIP-341 tapscript sighash.
pub(crate) fn p2tr_script_path_spend(
  tapscript: &ScriptBuf,
  private_key: &PrivateKey,
  sighash_type: TapSighashType,
) -> (Address, Transaction, bitcoin::taproot::Signature, Vec<u8>) {
  let secp = Secp256k1::new();
  let internal_key = PrivateKey::from_wif(NESTED_SEGWIT_WIF_PRIVATE_KEY)
    .unwrap()
    .public_key(&secp)
    .inner
    .x_only_public_key()
    .0;

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
    .unwrap();

  let to_spend = create_to_spend(&address, "foo");
  let psbt = create_to_sign(&to_spend, None, LockParams::default());

  let prevout = TxOut {
    value: Amount::ZERO,
    script_pubkey: address.script_pubkey(),
  };

  let sighash = SighashCache::new(psbt.unsigned_tx.clone())
    .taproot_script_spend_signature_hash(
      0,
      &sighash::Prevouts::All(&[prevout]),
      bitcoin::taproot::TapLeafHash::from_script(
        tapscript,
        bitcoin::taproot::LeafVersion::TapScript,
      ),
      sighash_type,
    )
    .unwrap();

  let keypair = Keypair::from_secret_key(&secp, &private_key.inner);
  let signature = bitcoin::taproot::Signature {
    signature: secp.sign_schnorr_no_aux_rand(
      &Message::from_digest_slice(sighash.as_ref()).unwrap(),
      &keypair,
    ),
    sighash_type,
  };

  (
    address,
    psbt.unsigned_tx,
    signature,
    control_block.serialize(),
  )
}

pub(crate) fn single_key_tapscript(private_key: &PrivateKey) -> ScriptBuf {
  let secp = Secp256k1::new();
  ScriptBuf::builder()
    .push_x_only_key(&private_key.public_key(&secp).inner.x_only_public_key().0)
    .push_opcode(opcodes::all::OP_CHECKSIG)
    .into_script()
}
