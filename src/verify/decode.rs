use super::*;

pub(super) fn decode_simple(address: &str, signature: &str) -> Result<Option<(Address, Witness)>> {
  let address = parse_address(address)?;
  // A simple proof is only a witness, so reject addresses whose valid spend
  // needs a scriptSig before decoding attacker-controlled data.
  require_simple_format(&address)?;
  if encoded_size_exceeds(signature, SIMPLE_SIGNATURE_PREFIX, MAX_ENCODED_SIZE)? {
    return Err(Error::ToSignInvalid);
  }

  let (_, bytes) = decode_payload(signature, SIMPLE_SIGNATURE_PREFIX, |signature| {
    error::SignatureDecode { signature }
  })?;

  // A witness this large exceeds the weight limit on its own.
  if bytes.len() > MAX_ENCODING_SIZE {
    return Err(Error::ToSignInvalid);
  }
  match preflight::witness_with_limit(&bytes, Some(MAX_WITNESS_ITEMS)) {
    preflight::Check::Valid(()) => {}
    preflight::Check::Malformed => return Err(Error::InvalidWitness),
    preflight::Check::OverLimit => {
      return match witness_limit(&address) {
        WitnessLimit::Invalid => Err(Error::InvalidWitness),
        WitnessLimit::Inconclusive => Ok(None),
      }
    }
  }

  let witness = decode_exact(&bytes, |reader| {
    Witness::consensus_decode_from_finite_reader(reader).context(error::WitnessMalformed)
  })?;

  Ok(Some((address, witness)))
}

pub(super) fn decode_full(address: &str, to_sign: &str) -> Result<Option<(Address, Transaction)>> {
  let address = parse_address(address)?;
  if encoded_size_exceeds(to_sign, FULL_SIGNATURE_PREFIX, MAX_ENCODED_SIZE)? {
    return Err(Error::ToSignInvalid);
  }

  let (to_sign, bytes) = decode_payload(to_sign, FULL_SIGNATURE_PREFIX, |transaction| {
    error::TransactionBase64Decode { transaction }
  })?;

  // A transaction this large exceeds the weight limit.
  if bytes.len() > MAX_ENCODING_SIZE {
    return Err(Error::ToSignInvalid);
  }
  match preflight::transaction_with_limit(&bytes, Some(MAX_WITNESS_ITEMS)) {
    preflight::Check::Valid(()) => {}
    preflight::Check::Malformed => return Err(Error::ToSignInvalid),
    preflight::Check::OverLimit => {
      return match witness_limit(&address) {
        WitnessLimit::Invalid => Err(Error::ToSignInvalid),
        WitnessLimit::Inconclusive => Ok(None),
      }
    }
  }

  let to_sign = decode_exact(&bytes, |reader| {
    Transaction::consensus_decode_from_finite_reader(reader).context(
      error::TransactionConsensusDecode {
        transaction: to_sign,
      },
    )
  })?;

  Ok(Some((address, to_sign)))
}

/// Decodes a proof of funds. `Ok(None)` means it exceeds a local resource
/// limit, which makes verification inconclusive, or has more inputs than
/// verification is bounded to.
pub(super) fn decode_pof(address: &str, to_sign: &str) -> Result<Option<(Address, Psbt)>> {
  let address = parse_address(address)?;
  if encoded_size_exceeds(to_sign, POF_SIGNATURE_PREFIX, MAX_POF_ENCODED_SIZE)? {
    return Ok(None);
  }

  let (_, bytes) = decode_payload(to_sign, POF_SIGNATURE_PREFIX, |transaction| {
    error::TransactionBase64Decode { transaction }
  })?;

  if bytes.len() > MAX_POF_DECODED_SIZE {
    return Ok(None);
  }

  let shape = match preflight::psbt(&bytes) {
    preflight::Check::Valid(shape) => shape,
    preflight::Check::Malformed => return Err(Error::ToSignInvalid),
    preflight::Check::OverLimit => return Ok(None),
  };

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
fn encoded_size_exceeds(encoded: &str, prefix: &str, max_size: usize) -> Result<bool> {
  Ok(strip_variant_prefix(encoded, prefix)?.len() > max_size)
}

/// How an address's verification treats a witness over the item limit.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum WitnessLimit {
  /// The limit is consensus-derived for this address type.
  Invalid,
  /// The witness may be valid under an upgradeable rule.
  Inconclusive,
}

/// The witness item limit policy for an address. V0's stack limit is a
/// consensus rule; V1 and future witness versions may use upgrade mechanisms
/// such as `OP_SUCCESSx` or unknown leaf versions, which are inconclusive
/// rather than invalid.
fn witness_limit(address: &Address) -> WitnessLimit {
  if address.script_pubkey().witness_version() == Some(bitcoin::WitnessVersion::V0) {
    WitnessLimit::Invalid
  } else {
    WitnessLimit::Inconclusive
  }
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
