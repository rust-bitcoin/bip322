use super::*;

pub(super) fn decode_simple(address: &str, signature: &str) -> Result<(Address, Witness)> {
  let address = parse_address(address)?;
  check_encoded_size(signature, SIMPLE_SIGNATURE_PREFIX, MAX_ENCODED_SIZE)?;

  let (_, bytes) = decode_payload(signature, SIMPLE_SIGNATURE_PREFIX, |signature| {
    error::SignatureDecode { signature }
  })?;

  // A witness this large exceeds the weight limit on its own.
  if bytes.len() > MAX_ENCODING_SIZE {
    return Err(Error::ToSignInvalid);
  }
  if !preflight::witness_with_limit(&bytes, witness_item_limit(&address)) {
    return Err(Error::InvalidWitness);
  }

  let witness = decode_exact(&bytes, |reader| {
    Witness::consensus_decode_from_finite_reader(reader).context(error::WitnessMalformed)
  })?;

  Ok((address, witness))
}

pub(super) fn decode_full(address: &str, to_sign: &str) -> Result<(Address, Transaction)> {
  let address = parse_address(address)?;
  check_encoded_size(to_sign, FULL_SIGNATURE_PREFIX, MAX_ENCODED_SIZE)?;

  let (to_sign, bytes) = decode_payload(to_sign, FULL_SIGNATURE_PREFIX, |transaction| {
    error::TransactionBase64Decode { transaction }
  })?;

  // A transaction this large exceeds the weight limit.
  if bytes.len() > MAX_ENCODING_SIZE
    || !preflight::transaction_with_limit(&bytes, witness_item_limit(&address))
  {
    return Err(Error::ToSignInvalid);
  }

  let to_sign = decode_exact(&bytes, |reader| {
    Transaction::consensus_decode_from_finite_reader(reader).context(
      error::TransactionConsensusDecode {
        transaction: to_sign,
      },
    )
  })?;

  Ok((address, to_sign))
}

/// Decodes a proof of funds. `Ok(None)` means it has more inputs than
/// verification is bounded to, which makes it inconclusive.
pub(super) fn decode_pof(address: &str, to_sign: &str) -> Result<Option<(Address, Psbt)>> {
  let address = parse_address(address)?;
  check_encoded_size(to_sign, POF_SIGNATURE_PREFIX, MAX_POF_ENCODED_SIZE)?;

  let (_, bytes) = decode_payload(to_sign, POF_SIGNATURE_PREFIX, |transaction| {
    error::TransactionBase64Decode { transaction }
  })?;

  if bytes.len() > MAX_POF_DECODED_SIZE {
    return Err(Error::ToSignInvalid);
  }

  let shape = preflight::psbt(&bytes).ok_or(Error::ToSignInvalid)?;

  // rust-bitcoin allocates a map for every input and output, so bound both
  // before decoding. The input bound matches `verify_pof`'s, so an encoded
  // proof gets the same verdict as the typed one.
  if shape.inputs > MAX_PROOF_INPUTS {
    return Ok(None);
  }
  if shape.outputs != 1 {
    return Err(Error::ToSignInvalid);
  }

  let psbt = decode_exact(&bytes, |reader| {
    Psbt::deserialize_from_reader(reader).map_err(|_| Error::ToSignInvalid)
  })?;

  Ok(Some((address, psbt)))
}

/// Rejects an encoded payload longer than `max_size` before Base64 decoding.
fn check_encoded_size(encoded: &str, prefix: &str, max_size: usize) -> Result<()> {
  if strip_variant_prefix(encoded, prefix)?.len() > max_size {
    return Err(Error::ToSignInvalid);
  }
  Ok(())
}

/// The witness item limit for an address with a known witness version.
fn witness_item_limit(address: &Address) -> Option<usize> {
  let version = address.script_pubkey().witness_version()?;
  matches!(
    version,
    bitcoin::WitnessVersion::V0 | bitcoin::WitnessVersion::V1
  )
  .then_some(MAX_WITNESS_ITEMS)
}

/// Decodes a value that must span all of `bytes`.
fn decode_exact<'a, T>(
  bytes: &'a [u8],
  decode: impl FnOnce(&mut &'a [u8]) -> Result<T>,
) -> Result<T> {
  let mut reader = bytes;
  let value = decode(&mut reader)?;

  if !reader.is_empty() {
    return Err(Error::TrailingBytes);
  }

  Ok(value)
}
