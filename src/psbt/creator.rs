use super::*;

/// Builds an unsigned BIP-322 PSBT for the given address and message, with
/// UTXO and script fields set so signers can produce partial signatures.
/// `witness_script` is the multisig witness or redeem script for the
/// challenge. `inputs` are additional UTXOs to prove control of, making this
/// a proof of funds.
pub fn create_bip322_psbt(
  address: &Address,
  message: impl AsRef<[u8]>,
  witness_script: Option<&ScriptBuf>,
  inputs: &[ProofInput],
  locks: LockParams,
) -> Result<Psbt> {
  let (_, mut psbt) = create_proof_psbt(address, message.as_ref(), witness_script, inputs, locks)?;

  for (proof_index, input) in inputs.iter().enumerate() {
    if let Some(script) = &input.witness_script {
      set_input_script(
        &mut psbt.inputs[proof_index + 1],
        script,
        &input.prevout.script_pubkey,
      )?;
    }
  }

  let spk = address.script_pubkey();

  if spk.is_p2wpkh() || spk.is_p2tr() || spk.is_p2pkh() {
    if witness_script.is_some() {
      return Err(Error::InvalidWitness);
    }
    return Ok(psbt);
  }

  let Some(witness_script) = witness_script else {
    // P2SH-P2WPKH: the signer derives the redeem script from its key.
    if spk.is_p2sh() {
      return Ok(psbt);
    }
    return Err(Error::InvalidWitness);
  };

  set_input_script(&mut psbt.inputs[0], witness_script, &spk)?;
  Ok(psbt)
}

/// Supplies the script metadata a signer needs for a multisig input.
fn set_input_script(
  input: &mut bitcoin::psbt::Input,
  witness_script: &ScriptBuf,
  script_pubkey: &Script,
) -> Result<()> {
  let p2wsh_program = ScriptBuf::new_p2wsh(&witness_script.wscript_hash());

  if *script_pubkey == p2wsh_program {
    input.witness_script = Some(witness_script.clone());
  } else if *script_pubkey == ScriptBuf::new_p2sh(&p2wsh_program.script_hash()) {
    input.witness_script = Some(witness_script.clone());
    input.redeem_script = Some(p2wsh_program);
  } else if *script_pubkey == ScriptBuf::new_p2sh(&witness_script.script_hash()) {
    if witness_script.len() > MAX_SCRIPT_ELEMENT_SIZE {
      return Err(Error::InvalidWitness);
    }
    input.redeem_script = Some(witness_script.clone());
  } else {
    return Err(Error::WitnessScriptMismatch);
  }

  Ok(())
}
