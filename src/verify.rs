use super::*;

/// This completely outward facing function is meant to be consumed by very naive users like when
/// compiling this library to WASM, where Javascript has no type safety. If you'd like to use the
/// more type safe / Rust variant use `fn simple_verify_inner`.
pub fn simple_verify(address: &str, message: &str, signature: &str) -> Result<()> {
  let address = Address::from_str(address)
    .context(error::AddressParse { address })?
    .assume_checked();

  let mut cursor = Cursor::new(
    general_purpose::STANDARD
      .decode(signature)
      .context(error::SignatureDecode { signature })?,
  );

  let witness =
    Witness::consensus_decode_from_finite_reader(&mut cursor).context(error::MalformedWitness)?;

  simple_verify_inner(&address, message.as_bytes(), witness)
}

/// Meant to be consumed by Rust applications
pub fn simple_verify_inner(address: &Address, message: &[u8], signature: Witness) -> Result<()> {
  full_verify_inner(
    address,
    message,
    create_to_sign(&create_to_spend(address, message), Some(signature))
      .extract_tx()
      .unwrap(),
  )
}

/// This completely outward facing function is meant to be consumed by very naive users like when
/// compiling this library to WASM, where Javascript has no type safety. If you'd like to use the
/// more type safe / Rust variant use `fn full_verify_inner`.
pub fn full_verify(address: &str, message: &str, to_sign: &str) -> Result<()> {
  let address = Address::from_str(address)
    .context(error::AddressParse { address })?
    .assume_checked();

  let mut cursor = Cursor::new(general_purpose::STANDARD.decode(to_sign).context(
    error::TransactionDecode {
      transaction: to_sign,
    },
  )?);

  let to_sign = Transaction::consensus_decode_from_finite_reader(&mut cursor).context(
    error::TransactionConsensusDecode {
      transaction: to_sign,
    },
  )?;

  full_verify_inner(&address, message.as_bytes(), to_sign)
}

/// Meant to be consumed by Rust applications
pub fn full_verify_inner(address: &Address, message: &[u8], to_sign: Transaction) -> Result<()> {
  if address
    .address_type()
    .is_some_and(|addr| addr != AddressType::P2tr)
  {
    return Err(Error::UnsupportedAddress {
      address: address.to_string(),
    });
  }

  let pub_key =
    if let bitcoin::address::Payload::WitnessProgram(witness_program) = address.payload() {
      if witness_program.version().to_num() != 1 {
        return Err(Error::UnsupportedAddress {
          address: address.to_string(),
        });
      }

      if witness_program.program().len() != 32 {
        return Err(Error::NotKeyPathSpend);
      }

      XOnlyPublicKey::from_slice(witness_program.program().as_bytes())
        .expect("should extract an xonly public key")
    } else {
      return Err(Error::UnsupportedAddress {
        address: address.to_string(),
      });
    };

  let to_spend = create_to_spend(address, message);

  let to_spend_outpoint = OutPoint {
    txid: to_spend.txid(),
    vout: 0,
  };

  if to_spend_outpoint != to_sign.input[0].previous_output {
    return Err(Error::Invalid);
  }

  let to_sign = create_to_sign(&to_spend, Some(to_sign.input[0].witness.clone()));

  if to_spend_outpoint != to_sign.unsigned_tx.input[0].previous_output {
    return Err(Error::Invalid);
  }

  let Some(witness) = to_sign.inputs[0].final_script_witness.clone() else {
    return Err(Error::Invalid);
  };

  let encoded_signature = witness.to_vec()[0].clone();

  let (signature, sighash_type) = match encoded_signature.len() {
    65 => (
      Signature::from_slice(&encoded_signature.as_slice()[..64])
        .context(error::InvalidSignature)?,
      TapSighashType::from_consensus_u8(encoded_signature[64]).context(error::InvalidSigHash)?,
    ),
    64 => (
      Signature::from_slice(encoded_signature.as_slice()).context(error::InvalidSignature)?,
      TapSighashType::Default,
    ),
    _ => {
      return Err(Error::SignatureLength {
        length: encoded_signature.len(),
        encoded_signature,
      })
    }
  };

  if !(sighash_type == TapSighashType::All || sighash_type == TapSighashType::Default) {
    return Err(Error::UnsupportedSigHashType {
      sighash_type: sighash_type.to_string(),
    });
  }

  let mut sighash_cache = SighashCache::new(to_sign.unsigned_tx);

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
    .verify_schnorr(&signature, &message, &pub_key)
    .map_err(|_| Error::Invalid)
}
