use super::*;

/// Message and challenge extracted from a BIP-322 signing request.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Bip322Psbt {
  /// The UTF-8 encoded message to be signed.
  pub message: Vec<u8>,
  /// The script pubkey being signed for.
  pub message_challenge: ScriptBuf,
}

/// Runs the detection checks on a PSBT.
pub fn detect_bip322_psbt(psbt: &Psbt) -> Option<Bip322Psbt> {
  let message = psbt
    .unknown
    .get(&bitcoin::psbt::raw::Key {
      type_value: PSBT_GLOBAL_GENERIC_SIGNED_MESSAGE,
      key: vec![],
    })?
    .clone();

  let first = psbt.inputs.first()?;
  let first_txin = psbt.unsigned_tx.input.first()?;

  if first_txin.previous_output.vout != 0 {
    return None;
  }

  let message_challenge = if let Some(txout) = &first.witness_utxo {
    if txout.value != Amount::ZERO {
      return None;
    }
    txout.script_pubkey.clone()
  } else if let Some(tx) = &first.non_witness_utxo {
    let txout = tx.output.first()?;
    if txout.value != Amount::ZERO {
      return None;
    }
    txout.script_pubkey.clone()
  } else {
    return None;
  };

  let to_spend = create_to_spend_from_script(&message_challenge, &message).ok()?;
  if first_txin.previous_output.txid != to_spend.compute_txid() {
    return None;
  }

  let outputs = &psbt.unsigned_tx.output;
  if outputs.len() != 1
    || !outputs[0].script_pubkey.is_op_return()
    || outputs[0].value != Amount::ZERO
  {
    return None;
  }

  Some(Bip322Psbt {
    message,
    message_challenge,
  })
}

/// Builds an unsigned BIP-322 PSBT for the given address and message, with
/// UTXO and script fields set so signers can produce partial signatures.
/// `witness_script` is the multisig witness or redeem script for the
/// challenge. `inputs` are additional UTXOs to prove control of, making this
/// a proof of funds.
#[allow(clippy::result_large_err)]
pub fn create_bip322_psbt(
  address: &Address,
  message: impl AsRef<[u8]>,
  witness_script: Option<&ScriptBuf>,
  inputs: &[ProofInput],
  locks: LockParams,
) -> Result<Psbt> {
  let to_spend = create_to_spend(address, &message)?;

  let mut tx_in = vec![TxIn {
    previous_output: OutPoint {
      txid: to_spend.compute_txid(),
      vout: 0,
    },
    script_sig: ScriptBuf::new(),
    sequence: locks.sequence,
    witness: Witness::new(),
  }];

  for input in inputs {
    tx_in.push(TxIn {
      previous_output: input.outpoint,
      script_sig: ScriptBuf::new(),
      sequence: Sequence::ZERO,
      witness: Witness::new(),
    });
  }

  let unsigned = Transaction {
    version: locks.version(),
    lock_time: locks.lock_time,
    input: tx_in,
    output: vec![TxOut {
      value: Amount::ZERO,
      script_pubkey: ScriptBuf::builder()
        .push_opcode(opcodes::all::OP_RETURN)
        .into_script(),
    }],
  };

  let mut psbt = Psbt::from_unsigned_tx(unsigned).map_err(|_| Error::ToSignInvalid)?;

  psbt.unknown.insert(
    bitcoin::psbt::raw::Key {
      type_value: PSBT_GLOBAL_GENERIC_SIGNED_MESSAGE,
      key: vec![],
    },
    message.as_ref().to_vec(),
  );

  psbt.inputs[0].witness_utxo = Some(to_spend.output[0].clone());

  for (proof_index, input) in inputs.iter().enumerate() {
    set_proof_input_utxo(&mut psbt.inputs[proof_index + 1], input, proof_index)?;
  }

  let spk = &to_spend.output[0].script_pubkey;

  if spk.is_p2wpkh() || spk.is_p2tr() || spk.is_p2pkh() {
    if witness_script.is_some() {
      return Err(Error::InvalidWitness);
    }
    if spk.is_p2pkh() {
      psbt.inputs[0].witness_utxo = None;
      psbt.inputs[0].non_witness_utxo = Some(to_spend);
    }
    return Ok(psbt);
  }

  let Some(witness_script) = witness_script else {
    if spk.is_p2sh() {
      return Ok(psbt);
    }
    return Err(Error::InvalidWitness);
  };

  let p2wsh_program = ScriptBuf::new_p2wsh(&witness_script.wscript_hash());

  if *spk == p2wsh_program {
    psbt.inputs[0].witness_script = Some(witness_script.clone());
  } else if *spk == ScriptBuf::new_p2sh(&p2wsh_program.script_hash()) {
    psbt.inputs[0].witness_script = Some(witness_script.clone());
    psbt.inputs[0].redeem_script = Some(p2wsh_program);
  } else if *spk == ScriptBuf::new_p2sh(&witness_script.script_hash()) {
    psbt.inputs[0].redeem_script = Some(witness_script.clone());
    // Legacy P2SH inputs require the full previous transaction per BIP174.
    psbt.inputs[0].witness_utxo = None;
    psbt.inputs[0].non_witness_utxo = Some(to_spend);
  } else {
    return Err(Error::UnsupportedAddress {
      address: address.to_string(),
    });
  }

  Ok(psbt)
}

/// Confirms the PSBT is a BIP-322 request via [`detect_bip322_psbt`], then
/// signs `input_index`, adding a partial signature for ECDSA scripts or
/// `tap_key_sig` for taproot. Does not finalize.
///
/// Input 0 is the message challenge; later inputs are proof-of-funds UTXOs
/// and are signed against their own previous output.
///
/// Returns the detected message and challenge, which integrators must
/// display to the user as message signing, not transaction signing.
#[allow(clippy::result_large_err)]
pub fn sign_bip322_psbt_input(
  psbt: &mut Psbt,
  private_key: &PrivateKey,
  input_index: usize,
) -> Result<Bip322Psbt> {
  let Some(detected) = detect_bip322_psbt(psbt) else {
    return Err(Error::OrdinaryPsbt);
  };

  if input_index >= psbt.unsigned_tx.input.len()
    || psbt.inputs.len() != psbt.unsigned_tx.input.len()
  {
    return Err(Error::ToSignInvalid);
  }

  let secp = Secp256k1::new();
  let pub_key = private_key.public_key(&secp);

  // Taproot sighashes commit to every prevout, so resolve them all.
  let mut prevouts = Vec::with_capacity(psbt.inputs.len());
  for index in 0..psbt.inputs.len() {
    prevouts.push(psbt_input_prevout(psbt, index)?);
  }

  // Input 0 is bound to the challenge; a proof input to its own prevout.
  let challenge = if input_index == 0 {
    detected.message_challenge.clone()
  } else {
    prevouts[input_index].script_pubkey.clone()
  };

  let challenge = &challenge;
  let value = prevouts[input_index].value;

  if challenge.is_p2tr() {
    let key_pair = Keypair::from_secret_key(&secp, &private_key.inner);
    let (x_only_public_key, _parity) = XOnlyPublicKey::from_keypair(&key_pair);
    psbt.inputs[input_index].tap_internal_key = Some(x_only_public_key);

    let sighash = SighashCache::new(psbt.unsigned_tx.clone())
      .taproot_key_spend_signature_hash(
        input_index,
        &sighash::Prevouts::All(&prevouts),
        TapSighashType::All,
      )
      .expect("signature hash should compute");

    let key_pair = key_pair
      .tap_tweak(&secp, psbt.inputs[input_index].tap_merkle_root)
      .to_keypair();

    let (output_key, _parity) = XOnlyPublicKey::from_keypair(&key_pair);
    if *challenge != ScriptBuf::new_p2tr_tweaked(output_key.dangerous_assume_tweaked()) {
      return Err(Error::PublicKeyMismatch);
    }

    let signature = secp.sign_schnorr_no_aux_rand(
      &secp256k1::Message::from_digest_slice(sighash.as_ref())
        .expect("should be cryptographically secure hash"),
      &key_pair,
    );

    psbt.inputs[input_index].tap_key_sig = Some(bitcoin::taproot::Signature {
      signature,
      sighash_type: TapSighashType::All,
    });

    return Ok(detected);
  }

  let sighash_type = EcdsaSighashType::All;

  let message = if challenge.is_p2wpkh() {
    if *challenge
      != ScriptBuf::new_p2wpkh(
        &pub_key
          .wpubkey_hash()
          .map_err(|_| Error::InvalidPublicKey)?,
      )
    {
      return Err(Error::PublicKeyMismatch);
    }

    let sighash = SighashCache::new(psbt.unsigned_tx.clone())
      .p2wpkh_signature_hash(input_index, challenge, value, sighash_type)
      .expect("signature hash should compute");
    secp256k1::Message::from_digest_slice(sighash.as_ref())
      .expect("should be cryptographically secure hash")
  } else if challenge.is_p2pkh() {
    if *challenge != ScriptBuf::new_p2pkh(&pub_key.pubkey_hash()) {
      return Err(Error::PublicKeyMismatch);
    }
    let sighash = SighashCache::new(psbt.unsigned_tx.clone())
      .legacy_signature_hash(input_index, challenge, sighash_type.to_u32())
      .expect("signature hash should compute");
    secp256k1::Message::from_digest_slice(sighash.as_ref())
      .expect("should be cryptographically secure hash")
  } else if challenge.is_p2sh()
    && psbt.inputs[input_index].witness_script.is_none()
    && psbt.inputs[input_index]
      .redeem_script
      .as_ref()
      .map_or(true, |redeem| redeem.is_p2wpkh())
  {
    let wpkh = pub_key
      .wpubkey_hash()
      .map_err(|_| Error::InvalidPublicKey)?;
    let redeem = ScriptBuf::new_p2wpkh(&wpkh);
    if *challenge != ScriptBuf::new_p2sh(&redeem.script_hash()) {
      return Err(Error::PublicKeyMismatch);
    }
    psbt.inputs[input_index].redeem_script = Some(redeem.clone());
    let sighash = SighashCache::new(psbt.unsigned_tx.clone())
      .p2wpkh_signature_hash(input_index, &redeem, value, sighash_type)
      .expect("signature hash should compute");
    secp256k1::Message::from_digest_slice(sighash.as_ref())
      .expect("should be cryptographically secure hash")
  } else {
    let script = match (
      &psbt.inputs[input_index].witness_script,
      &psbt.inputs[input_index].redeem_script,
    ) {
      (Some(witness_script), _) => witness_script.clone(),
      (None, Some(redeem_script)) => redeem_script.clone(),
      (None, None) => {
        return Err(Error::UnsupportedAddress {
          address: challenge.to_string(),
        })
      }
    };

    let (_, pubkeys) = parse_multisig(&script)?;
    if !pubkeys.contains(&pub_key) {
      return Err(Error::UnknownSigner);
    }

    let p2wsh = ScriptBuf::new_p2wsh(&script.wscript_hash());
    if *challenge != p2wsh
      && *challenge != ScriptBuf::new_p2sh(&p2wsh.script_hash())
      && *challenge != ScriptBuf::new_p2sh(&script.script_hash())
    {
      return Err(Error::PublicKeyMismatch);
    }

    let sighash = if psbt.inputs[input_index].witness_script.is_some() {
      SighashCache::new(psbt.unsigned_tx.clone())
        .p2wsh_signature_hash(input_index, &script, value, sighash_type)
        .expect("signature hash should compute")
        .to_byte_array()
    } else {
      SighashCache::new(psbt.unsigned_tx.clone())
        .legacy_signature_hash(input_index, &script, sighash_type.to_u32())
        .expect("signature hash should compute")
        .to_byte_array()
    };
    secp256k1::Message::from_digest_slice(&sighash)
      .expect("should be cryptographically secure hash")
  };

  let signature = secp.sign_ecdsa(&message, &private_key.inner);

  psbt.inputs[input_index].partial_sigs.insert(
    pub_key,
    bitcoin::ecdsa::Signature {
      signature,
      sighash_type,
    },
  );

  Ok(detected)
}

/// Takes the partial signature, requiring exactly one whose public key satisfies the challenge.
#[allow(clippy::result_large_err)]
fn single_partial_sig(
  input: &bitcoin::psbt::Input,
  challenge: &ScriptBuf,
  expected: impl Fn(&PublicKey) -> Result<ScriptBuf>,
) -> Result<(PublicKey, bitcoin::ecdsa::Signature)> {
  if input.partial_sigs.len() != 1 {
    return Err(Error::SignatureCount {
      required: 1,
      provided: input.partial_sigs.len(),
    });
  }

  let (pub_key, signature) = input
    .partial_sigs
    .iter()
    .next()
    .map(|(pub_key, signature)| (*pub_key, *signature))
    .expect("length checked above");

  if expected(&pub_key)? != *challenge {
    return Err(Error::PublicKeyMismatch);
  }

  Ok((pub_key, signature))
}

/// Assembles the collected partial signatures and finalizes every input per
/// BIP174, returning the variant-prefixed encoded signature — `ful` for a
/// single-input request, `pof` for a proof of funds.
#[allow(clippy::result_large_err)]
pub fn finalize_bip322_psbt(mut psbt: Psbt) -> Result<String> {
  let Some(detected) = detect_bip322_psbt(&psbt) else {
    return Err(Error::OrdinaryPsbt);
  };

  if psbt.inputs.len() != psbt.unsigned_tx.input.len() {
    return Err(Error::ToSignInvalid);
  }

  finalize_input(&mut psbt, 0, &detected.message_challenge)?;

  for index in 1..psbt.inputs.len() {
    let challenge = psbt_input_prevout(&psbt, index)?.script_pubkey;
    finalize_input(&mut psbt, index, &challenge)?;
  }

  if psbt.unsigned_tx.input.len() > 1 {
    // A proof of funds is encoded as the finalized PSBT itself.
    let mut buffer = Vec::new();
    psbt
      .serialize_to_writer(&mut buffer)
      .context(error::TransactionEncode)?;

    return Ok(format!(
      "{POF_SIGNATURE_PREFIX}{}",
      general_purpose::STANDARD.encode(buffer)
    ));
  }

  let to_sign = psbt.extract_tx_unchecked_fee_rate();

  let mut buffer = Vec::new();
  to_sign
    .consensus_encode(&mut buffer)
    .context(error::TransactionEncode)?;

  Ok(format!(
    "{FULL_SIGNATURE_PREFIX}{}",
    general_purpose::STANDARD.encode(buffer)
  ))
}

/// Finalizes one input against the script pubkey it spends.
#[allow(clippy::result_large_err)]
fn finalize_input(psbt: &mut Psbt, index: usize, challenge: &ScriptBuf) -> Result<()> {
  // Taproot key path: the tap_key_sig becomes a one-element witness.
  if let Some(signature) = psbt.inputs[index].tap_key_sig {
    if !challenge.is_p2tr() {
      return Err(Error::PublicKeyMismatch);
    }

    let mut witness = Witness::new();
    witness.push(signature.to_vec());
    psbt.inputs[index].final_script_witness = Some(witness);
    psbt.inputs[index].tap_key_sig = None;
    psbt.inputs[index].tap_internal_key = None;
    return Ok(());
  }

  // P2SH-P2WPKH: the redeem script is pushed in the script_sig.
  if let Some(redeem_script) = psbt.inputs[index].redeem_script.clone() {
    if redeem_script.is_p2wpkh() {
      let (pub_key, signature) = single_partial_sig(&psbt.inputs[index], challenge, |pk| {
        let wpkh = pk.wpubkey_hash().map_err(|_| Error::InvalidPublicKey)?;
        Ok(ScriptBuf::new_p2sh(
          &ScriptBuf::new_p2wpkh(&wpkh).script_hash(),
        ))
      })?;

      let mut witness = Witness::new();
      witness.push(signature.to_vec());
      witness.push(pub_key.to_bytes());
      psbt.inputs[index].final_script_witness = Some(witness);
      psbt.inputs[index].final_script_sig = Some(push_only_script(&redeem_script));
      psbt.inputs[index].partial_sigs.clear();
      psbt.inputs[index].redeem_script = None;
      return Ok(());
    }
  }

  if challenge.is_p2wpkh() {
    let (pub_key, signature) = single_partial_sig(&psbt.inputs[index], challenge, |pk| {
      let wpkh = pk.wpubkey_hash().map_err(|_| Error::InvalidPublicKey)?;
      Ok(ScriptBuf::new_p2wpkh(&wpkh))
    })?;

    let mut witness = Witness::new();
    witness.push(signature.to_vec());
    witness.push(pub_key.to_bytes());
    psbt.inputs[index].final_script_witness = Some(witness);
    psbt.inputs[index].partial_sigs.clear();
    return Ok(());
  }

  if challenge.is_p2pkh() {
    let (pub_key, signature) = single_partial_sig(&psbt.inputs[index], challenge, |pk| {
      Ok(ScriptBuf::new_p2pkh(&pk.pubkey_hash()))
    })?;

    psbt.inputs[index].final_script_sig = Some(
      ScriptBuf::builder()
        .push_slice(push_bytes(&signature.to_vec()))
        .push_slice(push_bytes(&pub_key.to_bytes()))
        .into_script(),
    );
    psbt.inputs[index].partial_sigs.clear();
    return Ok(());
  }

  let input = &psbt.inputs[index];
  let (script, is_witness) = match (&input.witness_script, &input.redeem_script) {
    (Some(witness_script), _) => (witness_script.clone(), true),
    (None, Some(redeem_script)) => (redeem_script.clone(), false),
    (None, None) => return Err(Error::InvalidWitness),
  };

  let (required, pubkeys) = parse_multisig(&script)?;

  // CHECKMULTISIG requires signatures in script pubkey order.
  let mut signatures = Vec::with_capacity(required);
  for pub_key in &pubkeys {
    if let Some(signature) = input.partial_sigs.get(pub_key) {
      signatures.push(signature.to_vec());
    }
  }

  if signatures.len() != required {
    return Err(Error::SignatureCount {
      required,
      provided: signatures.len(),
    });
  }

  if is_witness {
    let mut witness = Witness::new();
    witness.push::<&[u8]>(&[]);
    for signature in &signatures {
      witness.push(signature);
    }
    witness.push(script.as_bytes());
    psbt.inputs[index].final_script_witness = Some(witness);

    // P2SH-wrapped P2WSH also needs the program pushed in script_sig.
    if let Some(redeem_script) = psbt.inputs[index].redeem_script.clone() {
      psbt.inputs[index].final_script_sig = Some(push_only_script(&redeem_script));
    }
  } else {
    // OP_0 <sig_1> .. <sig_m> <redeemScript>
    let mut builder = ScriptBuf::builder().push_opcode(opcodes::OP_0);
    for signature in &signatures {
      builder = builder.push_slice(push_bytes(signature));
    }
    psbt.inputs[index].final_script_sig = Some(
      builder
        .push_slice(push_bytes(script.as_bytes()))
        .into_script(),
    );
  }

  psbt.inputs[index].partial_sigs.clear();
  psbt.inputs[index].witness_script = None;
  psbt.inputs[index].redeem_script = None;

  Ok(())
}
