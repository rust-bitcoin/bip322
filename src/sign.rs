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
  let address = parse_address(address)?;
  let private_key = PrivateKey::from_wif(wif_private_key).context(error::PrivateKeyParse)?;

  Ok(general_purpose::STANDARD.encode(sign_legacy(&address, message, &private_key)?.serialize()))
}

/// Signs a message in the BIP-137 legacy format from proper Rust types.
pub fn sign_legacy(
  address: &Address,
  message: &str,
  private_key: &PrivateKey,
) -> Result<MessageSignature> {
  if !matches!(address.to_address_data(), AddressData::P2pkh { .. }) {
    return Err(Error::UnsupportedAddress {
      address: address.to_string(),
    });
  }

  let secp = Secp256k1::new();
  let pubkey = private_key.public_key(&secp);

  if address.script_pubkey() != ScriptBuf::new_p2pkh(&pubkey.pubkey_hash()) {
    return Err(Error::PublicKeyMismatch);
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
  let witness = sign_simple(
    &parse_address(address)?,
    message,
    &parse_private_keys(wif_private_keys)?,
    parse_witness_script(witness_script_hex)?.as_ref(),
  )?;

  let mut buffer = Vec::new();
  witness
    .consensus_encode(&mut buffer)
    .context(error::WitnessEncoding)?;

  Ok(encode_payload(SIMPLE_SIGNATURE_PREFIX, &buffer))
}

/// Signs the BIP-322 full from spec-compliant string encodings.
pub fn sign_full_encoded(
  address: &str,
  message: &str,
  wif_private_keys: &[impl AsRef<str>],
  witness_script_hex: Option<&str>,
  locks: LockParams,
) -> Result<String> {
  let to_sign = sign_full(
    &parse_address(address)?,
    message,
    &parse_private_keys(wif_private_keys)?,
    parse_witness_script(witness_script_hex)?.as_ref(),
    locks,
  )?;

  let mut buffer = Vec::new();
  to_sign
    .consensus_encode(&mut buffer)
    .context(error::TransactionEncode)?;

  Ok(encode_payload(FULL_SIGNATURE_PREFIX, &buffer))
}

/// Signs the BIP-322 simple format and returns the witness.
///
/// The simple format is restricted to native segwit addresses; P2PKH and
/// P2SH addresses need the full format, whose `to_sign` carries the
/// `scriptSig` their spends require.
pub fn sign_simple(
  address: &Address,
  message: impl AsRef<[u8]>,
  private_keys: &[PrivateKey],
  witness_script: Option<&ScriptBuf>,
) -> Result<Witness> {
  require_simple_format(address)?;

  let tx = sign_full(
    address,
    message,
    private_keys,
    witness_script,
    LockParams::default(),
  )?;

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
  let to_sign = sign_pof(
    &parse_address(address)?,
    message,
    &parse_private_keys(wif_private_keys)?,
    parse_witness_script(witness_script_hex)?.as_ref(),
    inputs,
    locks,
  )?;

  let mut buffer = Vec::new();
  to_sign
    .serialize_to_writer(&mut buffer)
    .context(error::TransactionEncode)?;

  Ok(encode_payload(POF_SIGNATURE_PREFIX, &buffer))
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

  let (to_spend, mut to_sign) =
    create_proof_psbt(address, message.as_ref(), witness_script, inputs, locks)?;

  let prevouts: Vec<TxOut> = std::iter::once(to_spend.output[0].clone())
    .chain(inputs.iter().map(|input| input.prevout.clone()))
    .collect();

  sign_input(&mut to_sign, &prevouts, private_keys, witness_script, 0)?;

  for (proof_index, input) in inputs.iter().enumerate() {
    sign_input(
      &mut to_sign,
      &prevouts,
      &input.private_keys,
      input.witness_script.as_ref(),
      proof_index + 1,
    )?;
  }

  validate_weight(&to_sign.clone().extract_tx_unchecked_fee_rate())?;
  Ok(to_sign)
}

fn parse_private_keys(wif_private_keys: &[impl AsRef<str>]) -> Result<Vec<PrivateKey>> {
  wif_private_keys
    .iter()
    .map(|private_key| PrivateKey::from_wif(private_key.as_ref()).context(error::PrivateKeyParse))
    .collect()
}

fn parse_witness_script(witness_script_hex: Option<&str>) -> Result<Option<ScriptBuf>> {
  witness_script_hex
    .map(|hex| ScriptBuf::from_hex(hex).context(error::WitnessScriptParse))
    .transpose()
}
