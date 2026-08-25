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

/// Builds an unsigned BIP-322 PSBT for the given address and
/// message, with UTXO and script fields set so signers can produce partial
/// signatures. `witness_script` is the multisig witness or redeem script.
#[allow(clippy::result_large_err)]
pub fn create_bip322_psbt(
  address: &Address,
  message: impl AsRef<[u8]>,
  witness_script: Option<&ScriptBuf>,
  locks: LockParams,
) -> Result<Psbt> {
  let to_spend = create_to_spend(address, &message)?;
  let mut psbt = create_to_sign(&to_spend, None, locks)?;

  psbt.unknown.insert(
    bitcoin::psbt::raw::Key {
      type_value: PSBT_GLOBAL_GENERIC_SIGNED_MESSAGE,
      key: vec![],
    },
    message.as_ref().to_vec(),
  );

  let spk = &to_spend.output[0].script_pubkey;

  if spk.is_p2wpkh() || spk.is_p2tr() {
    if witness_script.is_some() {
      return Err(Error::InvalidWitness);
    }
    return Ok(psbt);
  }
  if spk.is_p2pkh() {
    if witness_script.is_some() {
      return Err(Error::InvalidWitness);
    }
    psbt.inputs[0].witness_utxo = None;
    psbt.inputs[0].non_witness_utxo = Some(to_spend);
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

/// Confirms the PSBT is a BIP-322 request via [`detect_bip322_psbt`],
/// then signs the first input, adding a partial signature for ECDSA scripts
/// or `tap_key_sig` for taproot. Does not finalize.
///
/// Returns the detected message and challenge, which integrators must
/// display to the user as message signing, not transaction signing.
#[allow(clippy::result_large_err)]
pub fn sign_bip322_psbt_input(psbt: &mut Psbt, private_key: &PrivateKey) -> Result<Bip322Psbt> {
  let Some(detected) = detect_bip322_psbt(psbt) else {
    return Err(Error::OrdinaryPsbt);
  };

  if psbt.unsigned_tx.input.len() != 1 {
    return Err(Error::ToSignInvalid);
  }

  let secp = Secp256k1::new();
  let pub_key = private_key.public_key(&secp);
  let challenge = &detected.message_challenge;

  if challenge.is_p2tr() {
    let key_pair = Keypair::from_secret_key(&secp, &private_key.inner);
    let (x_only_public_key, _parity) = XOnlyPublicKey::from_keypair(&key_pair);
    psbt.inputs[0].tap_internal_key = Some(x_only_public_key);

    let prevouts = [TxOut {
      value: Amount::ZERO,
      script_pubkey: challenge.clone(),
    }];
    let sighash = SighashCache::new(psbt.unsigned_tx.clone())
      .taproot_key_spend_signature_hash(0, &sighash::Prevouts::All(&prevouts), TapSighashType::All)
      .expect("signature hash should compute");

    let key_pair = key_pair
      .tap_tweak(&secp, psbt.inputs[0].tap_merkle_root)
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

    psbt.inputs[0].tap_key_sig = Some(bitcoin::taproot::Signature {
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
      .p2wpkh_signature_hash(0, challenge, Amount::ZERO, sighash_type)
      .expect("signature hash should compute");
    secp256k1::Message::from_digest_slice(sighash.as_ref())
      .expect("should be cryptographically secure hash")
  } else if challenge.is_p2pkh() {
    if *challenge != ScriptBuf::new_p2pkh(&pub_key.pubkey_hash()) {
      return Err(Error::PublicKeyMismatch);
    }
    let sighash = SighashCache::new(psbt.unsigned_tx.clone())
      .legacy_signature_hash(0, challenge, sighash_type.to_u32())
      .expect("signature hash should compute");
    secp256k1::Message::from_digest_slice(sighash.as_ref())
      .expect("should be cryptographically secure hash")
  } else if challenge.is_p2sh()
    && psbt.inputs[0].witness_script.is_none()
    && psbt.inputs[0]
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
    psbt.inputs[0].redeem_script = Some(redeem.clone());
    let sighash = SighashCache::new(psbt.unsigned_tx.clone())
      .p2wpkh_signature_hash(0, &redeem, Amount::ZERO, sighash_type)
      .expect("signature hash should compute");
    secp256k1::Message::from_digest_slice(sighash.as_ref())
      .expect("should be cryptographically secure hash")
  } else {
    let script = match (
      &psbt.inputs[0].witness_script,
      &psbt.inputs[0].redeem_script,
    ) {
      (Some(witness_script), _) => witness_script.clone(),
      (None, Some(redeem_script)) => redeem_script.clone(),
      (None, None) => {
        return Err(Error::UnsupportedAddress {
          address: challenge.to_string(),
        })
      }
    };

    // Only sign if this key is actually part of the multisig script.
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

    let sighash = if psbt.inputs[0].witness_script.is_some() {
      SighashCache::new(psbt.unsigned_tx.clone())
        .p2wsh_signature_hash(0, &script, Amount::ZERO, sighash_type)
        .expect("signature hash should compute")
        .to_byte_array()
    } else {
      SighashCache::new(psbt.unsigned_tx.clone())
        .legacy_signature_hash(0, &script, sighash_type.to_u32())
        .expect("signature hash should compute")
        .to_byte_array()
    };
    secp256k1::Message::from_digest_slice(&sighash)
      .expect("should be cryptographically secure hash")
  };

  let signature = secp.sign_ecdsa(&message, &private_key.inner);

  psbt.inputs[0].partial_sigs.insert(
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

/// Assembles the collected partial signatures in multisig script
/// order, finalizes the first input per BIP174, and returns the
/// variant-prefixed encoded signature (`ful`).
#[allow(clippy::result_large_err)]
pub fn finalize_bip322_psbt(mut psbt: Psbt) -> Result<String> {
  let Some(detected) = detect_bip322_psbt(&psbt) else {
    return Err(Error::OrdinaryPsbt);
  };

  if psbt.unsigned_tx.input.len() != 1 {
    return Err(Error::ToSignInvalid);
  }

  // Taproot key path: the tap_key_sig becomes a one-element witness.
  if let Some(signature) = psbt.inputs[0].tap_key_sig {
    if !detected.message_challenge.is_p2tr() {
      return Err(Error::PublicKeyMismatch);
    }

    let mut witness = Witness::new();
    witness.push(signature.to_vec());
    psbt.inputs[0].final_script_witness = Some(witness);
    psbt.inputs[0].tap_key_sig = None;
    psbt.inputs[0].tap_internal_key = None;
    return encode_finalized(psbt);
  }

  // P2WPKH: one partial signature plus its public key.
  if let Some(redeem_script) = psbt.inputs[0].redeem_script.clone() {
    if redeem_script.is_p2wpkh() {
      let (pub_key, signature) =
        single_partial_sig(&psbt.inputs[0], &detected.message_challenge, |pk| {
          let wpkh = pk.wpubkey_hash().map_err(|_| Error::InvalidPublicKey)?;
          Ok(ScriptBuf::new_p2sh(
            &ScriptBuf::new_p2wpkh(&wpkh).script_hash(),
          ))
        })?;

      let mut witness = Witness::new();
      witness.push(signature.to_vec());
      witness.push(pub_key.to_bytes());
      psbt.inputs[0].final_script_witness = Some(witness);
      psbt.inputs[0].final_script_sig = Some(push_only_script(&redeem_script));
      psbt.inputs[0].partial_sigs.clear();
      psbt.inputs[0].redeem_script = None;
      return encode_finalized(psbt);
    }
  }

  if detected.message_challenge.is_p2wpkh() {
    let (pub_key, signature) =
      single_partial_sig(&psbt.inputs[0], &detected.message_challenge, |pk| {
        let wpkh = pk.wpubkey_hash().map_err(|_| Error::InvalidPublicKey)?;
        Ok(ScriptBuf::new_p2wpkh(&wpkh))
      })?;
    let mut witness = Witness::new();
    witness.push(signature.to_vec());
    witness.push(pub_key.to_bytes());
    psbt.inputs[0].final_script_witness = Some(witness);
    psbt.inputs[0].partial_sigs.clear();
    return encode_finalized(psbt);
  }

  if detected.message_challenge.is_p2pkh() {
    let (pub_key, signature) =
      single_partial_sig(&psbt.inputs[0], &detected.message_challenge, |pk| {
        Ok(ScriptBuf::new_p2pkh(&pk.pubkey_hash()))
      })?;

    psbt.inputs[0].final_script_sig = Some(
      ScriptBuf::builder()
        .push_slice(push_bytes(&signature.to_vec()))
        .push_slice(push_bytes(&pub_key.to_bytes()))
        .into_script(),
    );
    psbt.inputs[0].partial_sigs.clear();
    return encode_finalized(psbt);
  }

  let input = &psbt.inputs[0];
  let (script, is_witness) = match (&input.witness_script, &input.redeem_script) {
    (Some(witness_script), _) => (witness_script.clone(), true),
    (None, Some(redeem_script)) => (redeem_script.clone(), false),
    (None, None) => return Err(Error::InvalidWitness),
  };

  let (required, pubkeys) = parse_multisig(&script)?;

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
    psbt.inputs[0].final_script_witness = Some(witness);

    // P2SH-wrapped P2WSH also needs the program pushed in script_sig.
    if let Some(redeem_script) = psbt.inputs[0].redeem_script.clone() {
      psbt.inputs[0].final_script_sig = Some(push_only_script(&redeem_script));
    }
  } else {
    // OP_0 <sig_1> .. <sig_m> <redeemScript>
    let mut builder = ScriptBuf::builder().push_opcode(opcodes::OP_0);
    for signature in &signatures {
      builder = builder.push_slice(push_bytes(signature));
    }
    psbt.inputs[0].final_script_sig = Some(
      builder
        .push_slice(push_bytes(script.as_bytes()))
        .into_script(),
    );
  }

  psbt.inputs[0].partial_sigs.clear();
  psbt.inputs[0].witness_script = None;
  psbt.inputs[0].redeem_script = None;

  encode_finalized(psbt)
}

/// Extracts the finalized transaction and encodes it as a `ful` signature.
#[allow(clippy::result_large_err)]
fn encode_finalized(psbt: Psbt) -> Result<String> {
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
