use super::*;

pub(super) fn decode_simple(address: &str, signature: &str) -> Result<(Address, Witness)> {
  let address = Address::from_str(address)
    .context(error::AddressParse { address })?
    .assume_checked();

  let signature = strip_variant_prefix(signature, SIMPLE_SIGNATURE_PREFIX)?;

  let bytes = general_purpose::STANDARD
    .decode(signature)
    .context(error::SignatureDecode { signature })?;
  if !valid_witness_encoding(&bytes) {
    return Err(Error::InvalidWitness);
  }
  let length = bytes.len() as u64;

  let mut cursor = bitcoin::io::Cursor::new(bytes);

  let witness =
    Witness::consensus_decode_from_finite_reader(&mut cursor).context(error::WitnessMalformed)?;

  if cursor.position() != length {
    return Err(Error::TrailingBytes);
  }

  Ok((address, witness))
}

pub(super) fn decode_full(address: &str, to_sign: &str) -> Result<(Address, Transaction)> {
  let address = Address::from_str(address)
    .context(error::AddressParse { address })?
    .assume_checked();

  let to_sign = strip_variant_prefix(to_sign, FULL_SIGNATURE_PREFIX)?;

  let bytes =
    general_purpose::STANDARD
      .decode(to_sign)
      .context(error::TransactionBase64Decode {
        transaction: to_sign,
      })?;
  if !valid_transaction_encoding(&bytes) {
    return Err(Error::ToSignInvalid);
  }

  let length = bytes.len() as u64;

  let mut cursor = bitcoin::io::Cursor::new(bytes);

  let to_sign = Transaction::consensus_decode_from_finite_reader(&mut cursor).context(
    error::TransactionConsensusDecode {
      transaction: to_sign,
    },
  )?;

  if cursor.position() != length {
    return Err(Error::TrailingBytes);
  }

  Ok((address, to_sign))
}

pub(super) fn decode_pof(address: &str, to_sign: &str) -> Result<(Address, Psbt)> {
  let address = Address::from_str(address)
    .context(error::AddressParse { address })?
    .assume_checked();

  let to_sign = strip_variant_prefix(to_sign, POF_SIGNATURE_PREFIX)?;

  let bytes =
    general_purpose::STANDARD
      .decode(to_sign)
      .context(error::TransactionBase64Decode {
        transaction: to_sign,
      })?;

  if !valid_psbt_encoding(&bytes) {
    return Err(Error::ToSignInvalid);
  }

  let length = bytes.len() as u64;

  let mut cursor = bitcoin::io::Cursor::new(bytes);

  let psbt = Psbt::deserialize_from_reader(&mut cursor).map_err(|_| Error::ToSignInvalid)?;

  if cursor.position() != length {
    return Err(Error::TrailingBytes);
  }

  Ok((address, psbt))
}
