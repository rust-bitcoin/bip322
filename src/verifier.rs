use {
  crate::{create_to_sign, create_to_spend},
  base64::{engine::general_purpose, Engine},
  bitcoin::{
    consensus::Decodable,
    secp256k1::{schnorr::Signature, Message, Secp256k1, XOnlyPublicKey},
    sighash::{self, SighashCache, TapSighashType},
    Address, Amount, OutPoint, Transaction, TxOut, Witness,
  },
  std::io::Cursor,
};

pub fn simple_verify(address: &Address, message: &str, signature: &str) -> bool {
  let to_spend = create_to_spend(address, message);
  let to_sign = create_to_sign(&to_spend);

  let mut cursor = Cursor::new(general_purpose::STANDARD.decode(signature).unwrap());

  let witness = match Witness::consensus_decode_from_finite_reader(&mut cursor) {
    Ok(witness) => witness,
    Err(_) => return false,
  };

  let encoded_signature = &witness.to_vec()[0];

  let (signature, sighash_type) = if encoded_signature.len() == 65 {
    (
      Signature::from_slice(&encoded_signature.as_slice()[..64]).unwrap(),
      TapSighashType::from_consensus_u8(encoded_signature[64]).unwrap(),
    )
  } else if encoded_signature.len() == 64 {
    (
      Signature::from_slice(encoded_signature.as_slice()).unwrap(),
      TapSighashType::Default,
    )
  } else {
    return false;
  };

  let pub_key =
    if let bitcoin::address::Payload::WitnessProgram(witness_program) = address.payload() {
      if witness_program.version().to_num() == 1 && witness_program.program().len() == 32 {
        XOnlyPublicKey::from_slice(witness_program.program().as_bytes()).unwrap()
      } else {
        return false;
      }
    } else {
      return false;
    };

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

  let message = Message::from_digest_slice(sighash.as_ref()).unwrap();

  Secp256k1::verification_only()
    .verify_schnorr(&signature, &message, &pub_key)
    .is_ok()
}

pub fn full_verify(address: &Address, message: &str, to_sign: &str) -> bool {
  let to_spend = create_to_spend(address, message);

  let mut cursor = Cursor::new(general_purpose::STANDARD.decode(to_sign).unwrap());
  let to_sign_tx = match Transaction::consensus_decode_from_finite_reader(&mut cursor) {
    Ok(to_sign) => to_sign,
    Err(_) => return false,
  };

  let to_spend_out_point = OutPoint {
    txid: to_spend.txid(),
    vout: 0,
  };

  if to_spend_out_point != to_sign_tx.input[0].previous_output {
    return false;
  }

  let encoded_signature = &to_sign_tx.input[0].witness.to_vec()[0];

  let (signature, sighash_type) = if encoded_signature.len() == 65 {
    (
      Signature::from_slice(&encoded_signature.as_slice()[..64]).unwrap(),
      TapSighashType::from_consensus_u8(encoded_signature[64]).unwrap(),
    )
  } else if encoded_signature.len() == 64 {
    (
      Signature::from_slice(encoded_signature.as_slice()).unwrap(),
      TapSighashType::Default,
    )
  } else {
    return false;
  };

  let pub_key =
    if let bitcoin::address::Payload::WitnessProgram(witness_program) = address.payload() {
      if witness_program.version().to_num() == 1 && witness_program.program().len() == 32 {
        XOnlyPublicKey::from_slice(witness_program.program().as_bytes()).unwrap()
      } else {
        return false;
      }
    } else {
      return false;
    };

  let mut sighash_cache = SighashCache::new(to_sign_tx);

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

  let message = Message::from_digest_slice(sighash.as_ref()).unwrap();

  Secp256k1::verification_only()
    .verify_schnorr(&signature, &message, &pub_key)
    .is_ok()
}
