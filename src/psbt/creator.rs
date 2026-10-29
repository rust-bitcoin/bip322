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
  std::str::from_utf8(message.as_ref()).map_err(|_| Error::ToSignInvalid)?;
  check_proof_input_count(inputs.len())?;

  let to_spend = create_to_spend(address, &message);
  let challenge_outpoint = OutPoint {
    txid: to_spend.compute_txid(),
    vout: 0,
  };

  let mut tx_in = vec![TxIn {
    previous_output: challenge_outpoint,
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

  validate_outpoints(&unsigned)?;
  let mut psbt = Psbt::from_unsigned_tx(unsigned).map_err(|_| Error::ToSignInvalid)?;

  // rust-bitcoin has no typed field for PSBT_GLOBAL_GENERIC_SIGNED_MESSAGE
  // yet, so it goes in the unknown map. Switch once upstream adds one.
  psbt.unknown.insert(
    bitcoin::psbt::raw::Key {
      type_value: PSBT_GLOBAL_GENERIC_SIGNED_MESSAGE,
      key: vec![],
    },
    message.as_ref().to_vec(),
  );

  psbt.inputs[0].witness_utxo = Some(to_spend.output[0].clone());

  for (proof_index, input) in inputs.iter().enumerate() {
    let psbt_input = &mut psbt.inputs[proof_index + 1];
    set_proof_input_utxo(psbt_input, input, proof_index)?;
    if let Some(script) = &input.witness_script {
      set_input_script(psbt_input, script, &input.prevout.script_pubkey)?;
    }
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

  set_input_script(&mut psbt.inputs[0], witness_script, spk)?;
  if *spk == ScriptBuf::new_p2sh(&witness_script.script_hash()) {
    // Legacy P2SH inputs require the full previous transaction per BIP174.
    psbt.inputs[0].non_witness_utxo = Some(to_spend);
  }
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
    if witness_script.len() > 520 {
      return Err(Error::InvalidWitness);
    }
    input.redeem_script = Some(witness_script.clone());
    input.witness_utxo = None;
  } else {
    return Err(Error::UnsupportedAddress {
      address: script_pubkey.to_string(),
    });
  }

  Ok(())
}
