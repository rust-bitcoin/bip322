use {
  super::*,
  crate::{create_to_sign, create_to_spend, error::Bip322Error},
  base64::{engine::general_purpose, Engine},
  bitcoin::{
    address::AddressType,
    consensus::Decodable,
    secp256k1::{schnorr::Signature, Message, Secp256k1, XOnlyPublicKey},
    sighash::{self, SighashCache, TapSighashType},
    Address, Amount, OutPoint, Transaction, TxOut, Witness,
  },
  std::io::Cursor,
};

fn extract_pub_key(address: &Address) -> Result<XOnlyPublicKey> {
  if address
    .address_type()
    .is_some_and(|addr| addr != AddressType::P2tr)
  {
    return Err(Bip322Error::InvalidAddress);
  }

  if let bitcoin::address::Payload::WitnessProgram(witness_program) = address.payload() {
    if witness_program.version().to_num() != 1 {
      return Err(Bip322Error::InvalidAddress);
    }

    if witness_program.program().len() != 32 {
      return Err(Bip322Error::NotKeyPathSpend);
    }

    Ok(
      XOnlyPublicKey::from_slice(witness_program.program().as_bytes())
        .expect("should extract an xonly public key"),
    )
  } else {
    Err(Bip322Error::InvalidAddress)
  }
}

fn decode_and_verify(
  encoded_signature: &Vec<u8>,
  pub_key: &XOnlyPublicKey,
  to_spend: Transaction,
  to_sign: Transaction,
) -> Result<()> {
  let (signature, sighash_type) = match encoded_signature.len() {
    65 => (
      Signature::from_slice(&encoded_signature.as_slice()[..64])
        .map_err(|_| Bip322Error::MalformedSignature)?,
      TapSighashType::from_consensus_u8(encoded_signature[64])
        .map_err(|_| Bip322Error::InvalidSigHash)?,
    ),
    64 => (
      Signature::from_slice(encoded_signature.as_slice())
        .map_err(|_| Bip322Error::MalformedSignature)?,
      TapSighashType::Default,
    ),
    _ => return Err(Bip322Error::MalformedSignature),
  };

  if !(sighash_type == TapSighashType::All || sighash_type == TapSighashType::Default) {
    return Err(Bip322Error::InvalidSigHash);
  }

  let mut sighash_cache = SighashCache::new(to_sign);

  let sighash = sighash_cache
    .taproot_key_spend_signature_hash(
      0,
      &sighash::Prevouts::All(&[TxOut {
        value: Amount::from_sat(0),
        script_pubkey: to_spend.output[0].clone().script_pubkey,
      }]),
      sighash_type,
    )
    .expect("signature hash should compute");

  let message =
    Message::from_digest_slice(sighash.as_ref()).expect("should be cryptographically secure hash");

  Secp256k1::verification_only()
    .verify_schnorr(&signature, &message, pub_key)
    .map_err(|_| Bip322Error::Invalid)
}

pub fn simple_verify(address: &Address, message: &str, signature: &str) -> Result<()> {
  let pub_key = extract_pub_key(address)?;
  let to_spend = create_to_spend(address, message);
  let to_sign = create_to_sign(&to_spend);

  let mut cursor = Cursor::new(
    general_purpose::STANDARD
      .decode(signature)
      .map_err(|_| Bip322Error::MalformedSignature)?,
  );

  let witness = match Witness::consensus_decode_from_finite_reader(&mut cursor) {
    Ok(witness) => witness,
    Err(_) => return Err(Bip322Error::MalformedSignature),
  };

  let encoded_signature = &witness.to_vec()[0];

  decode_and_verify(encoded_signature, &pub_key, to_spend, to_sign.unsigned_tx)
}

pub fn full_verify(address: &Address, message: &str, to_sign_base64: &str) -> Result<()> {
  let pub_key = extract_pub_key(address)?;
  let to_spend = create_to_spend(address, message);

  let mut cursor = Cursor::new(
    general_purpose::STANDARD
      .decode(to_sign_base64)
      .map_err(|_| Bip322Error::MalformedSignature)?,
  );

  let to_sign = Transaction::consensus_decode_from_finite_reader(&mut cursor)
    .map_err(|_| Bip322Error::MalformedSignature)?;

  let to_spend_out_point = OutPoint {
    txid: to_spend.txid(),
    vout: 0,
  };

  if to_spend_out_point != to_sign.input[0].previous_output {
    return Err(Bip322Error::Invalid);
  }

  let encoded_signature = &to_sign.input[0].witness.to_vec()[0];

  decode_and_verify(encoded_signature, &pub_key, to_spend, to_sign)
}
