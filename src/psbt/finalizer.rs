use super::*;

/// Assembles the collected partial signatures and finalizes every input per
/// BIP174, returning the variant-prefixed encoded signature — `ful` for a
/// single-input request, `pof` for a proof of funds.
///
/// This is a BIP174-style assembler: it enforces the structural and sighash
/// rules needed to build the proof, but does not cryptographically verify the
/// signatures. Callers must verify the resulting proof before relying on it.
pub fn finalize_bip322_psbt(mut psbt: Psbt) -> Result<String> {
  let Some(detected) = detect_bip322_psbt(&psbt) else {
    return Err(Error::OrdinaryPsbt);
  };

  validate_psbt_structure(&psbt)?;
  check_input_count(psbt.unsigned_tx.input.len())?;
  let resolver = PrevoutResolver::new(&psbt)?;
  let mut challenges = Vec::with_capacity(psbt.inputs.len());
  for index in 0..psbt.inputs.len() {
    let prevout = checked_psbt_input_prevout(&psbt, &resolver, index)?;
    if index == 0 && prevout.script_pubkey != detected.message_challenge {
      return Err(Error::ToSignInvalid);
    }
    challenges.push(prevout.script_pubkey);
  }

  for (index, challenge) in challenges.iter().enumerate() {
    finalize_input(&mut psbt, index, challenge)?;
  }

  if psbt.unsigned_tx.input.len() > 1 {
    validate_weight(&psbt.clone().extract_tx_unchecked_fee_rate())?;
    // A proof of funds is encoded as the finalized PSBT itself.
    let mut buffer = Vec::new();
    psbt
      .serialize_to_writer(&mut buffer)
      .context(error::TransactionEncode)?;

    return Ok(encode_payload(POF_SIGNATURE_PREFIX, &buffer));
  }

  let to_sign = psbt.extract_tx_unchecked_fee_rate();
  validate_weight(&to_sign)?;

  let mut buffer = Vec::new();
  to_sign
    .consensus_encode(&mut buffer)
    .context(error::TransactionEncode)?;

  Ok(encode_payload(FULL_SIGNATURE_PREFIX, &buffer))
}

/// Removes all non-final BIP174 input fields after successful finalization.
fn clear_non_final_fields(input: &mut bitcoin::psbt::Input) {
  input.partial_sigs.clear();
  input.sighash_type = None;
  input.redeem_script = None;
  input.witness_script = None;
  input.bip32_derivation.clear();
  input.ripemd160_preimages.clear();
  input.sha256_preimages.clear();
  input.hash160_preimages.clear();
  input.hash256_preimages.clear();
  input.tap_key_sig = None;
  input.tap_script_sigs.clear();
  input.tap_scripts.clear();
  input.tap_key_origins.clear();
  input.tap_internal_key = None;
  input.tap_merkle_root = None;
}

/// Finalizes one input against the script pubkey it spends.
fn finalize_input(psbt: &mut Psbt, index: usize, challenge: &ScriptBuf) -> Result<()> {
  // Taproot key path: the tap_key_sig becomes a one-element witness.
  if let Some(signature) = psbt.inputs[index].tap_key_sig {
    if !challenge.is_p2tr() {
      return Err(Error::PublicKeyMismatch);
    }

    validate_final_taproot_sighash(&psbt.inputs[index], signature.sighash_type)?;

    let mut witness = Witness::new();
    witness.push(signature.to_vec());
    psbt.inputs[index].final_script_sig = None;
    psbt.inputs[index].final_script_witness = Some(witness);
    clear_non_final_fields(&mut psbt.inputs[index]);
    return Ok(());
  }

  // P2SH-P2WPKH: the redeem script is pushed in the script_sig.
  if let Some(redeem_script) = psbt.inputs[index].redeem_script.clone() {
    if redeem_script.is_p2wpkh() {
      let (pub_key, signature) = single_partial_sig(&psbt.inputs[index], challenge, |pk| {
        let wpkh = pk.wpubkey_hash().context(error::UncompressedPublicKey)?;
        if ScriptBuf::new_p2wpkh(&wpkh) != redeem_script {
          return Err(Error::PublicKeyMismatch);
        }
        Ok(ScriptBuf::new_p2sh(&redeem_script.script_hash()))
      })?;

      let mut witness = Witness::new();
      witness.push(signature.to_vec());
      witness.push(pub_key.to_bytes());
      psbt.inputs[index].final_script_witness = Some(witness);
      psbt.inputs[index].final_script_sig = Some(push_only_script(&redeem_script));
      clear_non_final_fields(&mut psbt.inputs[index]);
      return Ok(());
    }
  }

  if challenge.is_p2wpkh() {
    let (pub_key, signature) = single_partial_sig(&psbt.inputs[index], challenge, |pk| {
      let wpkh = pk.wpubkey_hash().context(error::UncompressedPublicKey)?;
      Ok(ScriptBuf::new_p2wpkh(&wpkh))
    })?;

    let mut witness = Witness::new();
    witness.push(signature.to_vec());
    witness.push(pub_key.to_bytes());
    psbt.inputs[index].final_script_sig = None;
    psbt.inputs[index].final_script_witness = Some(witness);
    clear_non_final_fields(&mut psbt.inputs[index]);
    return Ok(());
  }

  if challenge.is_p2pkh() {
    let (pub_key, signature) = single_partial_sig(&psbt.inputs[index], challenge, |pk| {
      Ok(ScriptBuf::new_p2pkh(&pk.pubkey_hash()))
    })?;

    psbt.inputs[index].final_script_witness = None;
    psbt.inputs[index].final_script_sig = Some(
      ScriptBuf::builder()
        .push_slice(push_bytes(&signature.to_vec()))
        .push_slice(push_bytes(&pub_key.to_bytes()))
        .into_script(),
    );
    clear_non_final_fields(&mut psbt.inputs[index]);
    return Ok(());
  }

  let input = &psbt.inputs[index];
  let (script, is_witness) = match (&input.witness_script, &input.redeem_script) {
    (Some(witness_script), _) => (witness_script.clone(), true),
    (None, Some(redeem_script)) => (redeem_script.clone(), false),
    (None, None) => return Err(Error::InvalidWitness),
  };

  require_multisig_challenge(&script, challenge, is_witness, input.redeem_script.as_ref())?;

  let (required, pubkeys) = parse_multisig(&script)?;
  let sighash_type = declared_ecdsa_sighash(input)?;
  if input
    .partial_sigs
    .values()
    .any(|signature| signature.sighash_type != sighash_type)
  {
    return Err(Error::SigHashTypeUnsupported {
      sighash_type: sighash_type.to_string(),
    });
  }

  // CHECKMULTISIG requires signatures in script pubkey order.
  let mut signatures = Vec::with_capacity(required);
  for pub_key in &pubkeys {
    if signatures.len() == required {
      break;
    }
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
    } else {
      psbt.inputs[index].final_script_sig = None;
    }
  } else {
    psbt.inputs[index].final_script_witness = None;
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

  clear_non_final_fields(&mut psbt.inputs[index]);

  Ok(())
}
