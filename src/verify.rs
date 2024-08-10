use super::*;

/// Verifies the BIP-322 simple from encoded values, i.e. address encoding, message string and
/// signature base64 string.
pub fn verify_simple_encoded(address: &str, message: &str, signature: &str) -> Result<()> {
  let address = Address::from_str(address)
    .context(error::AddressParse { address })?
    .assume_checked();

  let mut cursor = Cursor::new(
    general_purpose::STANDARD
      .decode(signature)
      .context(error::SignatureDecode { signature })?,
  );

  let witness =
    Witness::consensus_decode_from_finite_reader(&mut cursor).context(error::WitnessMalformed)?;

  verify_simple(&address, message.as_bytes(), witness)
}

/// Verifies the BIP-322 full from encoded values, i.e. address encoding, message string and
/// transaction base64 string.
pub fn verify_full_encoded(address: &str, message: &str, to_sign: &str) -> Result<()> {
  let address = Address::from_str(address)
    .context(error::AddressParse { address })?
    .assume_checked();

  let mut cursor = Cursor::new(general_purpose::STANDARD.decode(to_sign).context(
    error::TransactionBase64Decode {
      transaction: to_sign,
    },
  )?);

  let to_sign = Transaction::consensus_decode_from_finite_reader(&mut cursor).context(
    error::TransactionConsensusDecode {
      transaction: to_sign,
    },
  )?;

  verify_full(&address, message.as_bytes(), to_sign)
}

/// Verifies the BIP-322 simple from proper Rust types.
pub fn verify_simple(address: &Address, message: &[u8], signature: Witness) -> Result<()> {
  verify_full(
    address,
    message,
    create_to_sign(&create_to_spend(address, message)?, Some(signature))?
      .extract_tx()
      .context(error::TransactionExtract)?,
  )
}

/// Verifies the BIP-322 full from proper Rust types.
pub fn verify_full(address: &Address, message: &[u8], to_sign: Transaction) -> Result<()> {
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

  let to_spend = create_to_spend(address, message)?;
  let to_sign = create_to_sign(&to_spend, Some(to_sign.input[0].witness.clone()))?;

  let to_spend_outpoint = OutPoint {
    txid: to_spend.txid(),
    vout: 0,
  };

  if to_spend_outpoint != to_sign.unsigned_tx.input[0].previous_output {
    return Err(Error::ToSignInvalid);
  }

  let Some(witness) = to_sign.inputs[0].final_script_witness.clone() else {
    return Err(Error::WitnessEmpty);
  };

  let encoded_signature = witness.to_vec()[0].clone();

  let (signature, sighash_type) = match encoded_signature.len() {
    65 => (
      Signature::from_slice(&encoded_signature.as_slice()[..64])
        .context(error::SignatureInvalid)?,
      TapSighashType::from_consensus_u8(encoded_signature[64])
        .context(error::SigHashTypeInvalid)?,
    ),
    64 => (
      Signature::from_slice(encoded_signature.as_slice()).context(error::SignatureInvalid)?,
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
    return Err(Error::SigHashTypeUnsupported {
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
    .context(error::SignatureInvalid)
}
