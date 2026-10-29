use super::*;

mod input;

pub use self::input::*;

/// Extra UTXO included in a proof of funds.
#[derive(Clone, Debug)]
pub struct ProofInput {
  /// The outpoint of the UTXO being proven
  pub outpoint: OutPoint,
  /// The previous output being spent
  pub prevout: TxOut,
  /// Full previous transaction for this input's outpoint. Required for every
  /// legacy (non-segwit) input when constructing a proof. Verification may
  /// additionally inherit this data from an earlier input in the same PSBT.
  pub prev_tx: Option<Transaction>,
  /// Key(s) that satisfy the input: one for single-sig, `m` for an `m`-of-`n` multisig
  pub private_keys: Vec<PrivateKey>,
  /// Witness/redeem script.
  pub witness_script: Option<ScriptBuf>,
}

/// Signs a message in the BIP-137 legacy format from string inputs.
pub fn sign_legacy_encoded(address: &str, message: &str, wif_private_key: &str) -> Result<String> {
  let address = Address::from_str(address)
    .context(error::AddressParse { address })?
    .assume_checked();
  let private_key = PrivateKey::from_wif(wif_private_key).context(error::PrivateKeyParse)?;

  Ok(general_purpose::STANDARD.encode(sign_legacy(&address, message, &private_key)?.serialize()))
}

/// Signs a message in the BIP-137 legacy format from proper Rust types.
pub fn sign_legacy(
  address: &Address,
  message: &str,
  private_key: &PrivateKey,
) -> Result<MessageSignature> {
  let secp = Secp256k1::new();
  let pubkey = private_key.public_key(&secp);

  if address.script_pubkey() != ScriptBuf::new_p2pkh(&pubkey.pubkey_hash()) {
    return Err(Error::UnsupportedAddress {
      address: address.to_string(),
    });
  }

  let msg = Message::from_digest(signed_msg_hash(message).to_byte_array());

  let recoverable = secp.sign_ecdsa_recoverable(&msg, &private_key.inner);

  Ok(MessageSignature::new(recoverable, pubkey.compressed))
}

/// Signs the BIP-322 simple from spec-compliant string encodings.
pub fn sign_simple_encoded(
  address: &str,
  message: &str,
  wif_private_keys: &[impl AsRef<str>],
  witness_script_hex: Option<&str>,
) -> Result<String> {
  let address = Address::from_str(address)
    .context(error::AddressParse { address })?
    .assume_checked();

  let private_keys: Vec<PrivateKey> = wif_private_keys
    .iter()
    .map(|private_key| PrivateKey::from_wif(private_key.as_ref()).context(error::PrivateKeyParse))
    .collect::<Result<Vec<_>>>()?;

  let witness_script = witness_script_hex
    .map(|hex| ScriptBuf::from_hex(hex).context(error::WitnessScriptParse))
    .transpose()?;

  let witness = sign_simple(&address, message, &private_keys, witness_script.as_ref())?;

  let mut buffer = Vec::new();

  witness
    .consensus_encode(&mut buffer)
    .context(error::WitnessEncoding)?;

  Ok(format!(
    "{SIMPLE_SIGNATURE_PREFIX}{}",
    general_purpose::STANDARD.encode(buffer)
  ))
}

/// Signs the BIP-322 full from spec-compliant string encodings.
pub fn sign_full_encoded(
  address: &str,
  message: &str,
  wif_private_keys: &[impl AsRef<str>],
  witness_script_hex: Option<&str>,
  locks: LockParams,
) -> Result<String> {
  let address = Address::from_str(address)
    .context(error::AddressParse { address })?
    .assume_checked();

  let private_keys: Vec<PrivateKey> = wif_private_keys
    .iter()
    .map(|private_key| PrivateKey::from_wif(private_key.as_ref()).context(error::PrivateKeyParse))
    .collect::<Result<Vec<_>>>()?;

  let witness_script = witness_script_hex
    .map(|hex| ScriptBuf::from_hex(hex).context(error::WitnessScriptParse))
    .transpose()?;

  let tx = sign_full(
    &address,
    message,
    &private_keys,
    witness_script.as_ref(),
    locks,
  )?;

  let mut buffer = Vec::new();

  tx.consensus_encode(&mut buffer)
    .context(error::TransactionEncode)?;

  Ok(format!(
    "{FULL_SIGNATURE_PREFIX}{}",
    general_purpose::STANDARD.encode(buffer)
  ))
}

/// Signs the BIP-322 simple format and returns the witness.
pub fn sign_simple(
  address: &Address,
  message: impl AsRef<[u8]>,
  private_keys: &[PrivateKey],
  witness_script: Option<&ScriptBuf>,
) -> Result<Witness> {
  if matches!(address.to_address_data(), AddressData::P2sh { .. }) {
    return Err(Error::UnsupportedAddress {
      address: address.to_string(),
    });
  }

  let tx = sign_full(
    address,
    message,
    private_keys,
    witness_script,
    LockParams::default(),
  )?;

  if tx.input[0].witness.is_empty() {
    return Err(Error::UnsupportedAddress {
      address: address.to_string(),
    });
  }

  Ok(tx.input[0].witness.clone())
}

/// Signs the BIP-322 full format and returns the full transaction.
pub fn sign_full(
  address: &Address,
  message: impl AsRef<[u8]>,
  private_keys: &[PrivateKey],
  witness_script: Option<&ScriptBuf>,
  locks: LockParams,
) -> Result<Transaction> {
  if private_keys.is_empty() {
    return Err(Error::NoPrivateKeys);
  }

  let to_spend = create_to_spend(address, &message);
  let mut to_sign = create_to_sign(&to_spend, None, locks);

  let prevout = to_spend.output[0].clone();
  sign_input(&mut to_sign, &[prevout], private_keys, witness_script, 0)?;

  let to_sign = to_sign.extract_tx().context(error::TransactionExtract)?;
  validate_weight(&to_sign)?;
  Ok(to_sign)
}

/// Signs the BIP-322 full proof of funds from string inputs.
pub fn sign_pof_encoded(
  address: &str,
  message: &str,
  wif_private_keys: &[impl AsRef<str>],
  witness_script_hex: Option<&str>,
  inputs: &[ProofInput],
  locks: LockParams,
) -> Result<String> {
  let address = Address::from_str(address)
    .context(error::AddressParse { address })?
    .assume_checked();

  let private_keys: Vec<PrivateKey> = wif_private_keys
    .iter()
    .map(|private_key| PrivateKey::from_wif(private_key.as_ref()).context(error::PrivateKeyParse))
    .collect::<Result<Vec<_>>>()?;

  let witness_script = witness_script_hex
    .map(|hex| ScriptBuf::from_hex(hex).context(error::WitnessScriptParse))
    .transpose()?;

  let to_sign = sign_pof(
    &address,
    message,
    &private_keys,
    witness_script.as_ref(),
    inputs,
    locks,
  )?;

  let mut buffer = Vec::new();
  to_sign
    .serialize_to_writer(&mut buffer)
    .context(error::TransactionEncode)?;

  Ok(format!(
    "{POF_SIGNATURE_PREFIX}{}",
    general_purpose::STANDARD.encode(buffer)
  ))
}

/// Signs a BIP-322 full proof
pub fn sign_pof(
  address: &Address,
  message: impl AsRef<[u8]>,
  private_keys: &[PrivateKey],
  witness_script: Option<&ScriptBuf>,
  inputs: &[ProofInput],
  locks: LockParams,
) -> Result<Psbt> {
  if private_keys.is_empty() {
    return Err(Error::NoPrivateKeys);
  }

  if inputs.is_empty() {
    return Err(Error::NoProofInputs);
  }

  check_proof_input_count(inputs.len())?;

  std::str::from_utf8(message.as_ref()).map_err(|_| Error::ToSignInvalid)?;

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
  let mut to_sign = Psbt::from_unsigned_tx(unsigned).map_err(|_| Error::ToSignInvalid)?;

  to_sign.unknown.insert(
    bitcoin::psbt::raw::Key {
      type_value: PSBT_GLOBAL_GENERIC_SIGNED_MESSAGE,
      key: vec![],
    },
    message.as_ref().to_vec(),
  );

  // BIP-174: a segwit challenge carries a witness_utxo, a legacy one the
  // full to_spend transaction.
  if is_segwit_input(&to_spend.output[0].script_pubkey, witness_script) {
    to_sign.inputs[0].witness_utxo = Some(to_spend.output[0].clone());
  } else {
    to_sign.inputs[0].non_witness_utxo = Some(to_spend.clone());
  }

  let mut prevouts = Vec::with_capacity(inputs.len() + 1);
  prevouts.push(to_spend.output[0].clone());
  for input in inputs {
    prevouts.push(input.prevout.clone());
  }

  sign_input(&mut to_sign, &prevouts, private_keys, witness_script, 0)?;

  for (proof_index, input) in inputs.iter().enumerate() {
    let input_index = proof_index + 1;

    set_proof_input_utxo(&mut to_sign.inputs[input_index], input, proof_index)?;

    sign_input(
      &mut to_sign,
      &prevouts,
      &input.private_keys,
      input.witness_script.as_ref(),
      input_index,
    )?;
  }

  validate_weight(&to_sign.clone().extract_tx_unchecked_fee_rate())?;
  Ok(to_sign)
}
