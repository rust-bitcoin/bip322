use {
  bitcoin::{
    absolute::LockTime,
    blockdata::script,
    consensus::{Decodable, Encodable},
    key::{Keypair, TapTweak},
    opcodes,
    psbt::Psbt,
    script::PushBytes,
    secp256k1::{self, schnorr::Signature, Message, Secp256k1, XOnlyPublicKey},
    sighash::{self, SighashCache, TapSighashType},
    transaction::Version,
    Amount, OutPoint, PrivateKey, PublicKey, ScriptBuf, Sequence, Transaction, TxIn, TxOut,
    Witness,
  },
  bitcoin_hashes::{sha256, Hash},
  std::{io::Cursor, str},
};

pub struct Wallet {
  pub btc_address: Address,
  pub descriptor: miniscript::Descriptor<PublicKey>,
  pub ordinal_address: Address,
  pub private_key: PrivateKey,
}

impl Wallet {
  pub fn new(wif_private_key: &str) -> Self {
    let secp = Secp256k1::new();
    let private_key = PrivateKey::from_wif(wif_private_key).unwrap();
    let public_key = private_key.public_key(&secp);
    let descriptor = miniscript::Descriptor::new_tr(public_key, None).unwrap();

    Self {
      btc_address: miniscript::Descriptor::new_sh_wpkh(public_key)
        .unwrap()
        .address(Network::Regtest)
        .unwrap(),
      descriptor: descriptor.clone(),
      ordinal_address: descriptor.address(Network::Regtest).unwrap(),
      private_key,
    }
  }
}

const TAG: &str = "BIP0322-signed-message";

// message_hash = sha256(sha256(tag) || sha256(tag) || message); see BIP340
fn message_hash(message: &str) -> Vec<u8> {
  let mut tag_hash = sha256::Hash::hash(TAG.as_bytes()).to_byte_array().to_vec();
  tag_hash.extend(tag_hash.clone());
  tag_hash.extend(message.as_bytes());

  sha256::Hash::hash(tag_hash.as_slice())
    .to_byte_array()
    .to_vec()
}

fn to_spend(address: &Address, message: &str) -> Transaction {
  Transaction {
    version: Version(0),
    lock_time: LockTime::ZERO,
    input: vec![TxIn {
      previous_output: OutPoint {
        txid: "0000000000000000000000000000000000000000000000000000000000000000"
          .parse()
          .unwrap(),
        vout: 0xFFFFFFFF,
      },
      script_sig: script::Builder::new()
        .push_int(0)
        .push_slice::<&PushBytes>(message_hash(message).as_slice().try_into().unwrap())
        .into_script(),
      sequence: Sequence(0),
      witness: Witness::new(),
    }],
    output: vec![TxOut {
      value: Amount::from_sat(0),
      script_pubkey: address.script_pubkey(),
    }],
  }
}

fn to_sign(to_spend_tx: Transaction) -> Transaction {
  Transaction {
    version: Version(0),
    lock_time: LockTime::ZERO,
    input: vec![TxIn {
      previous_output: OutPoint {
        txid: to_spend_tx.txid(),
        vout: 0,
      },
      script_sig: ScriptBuf::new(),
      sequence: Sequence(0),
      witness: Witness::new(),
    }],
    output: vec![TxOut {
      value: Amount::from_sat(0),
      script_pubkey: script::Builder::new()
        .push_opcode(opcodes::all::OP_RETURN)
        .into_script(),
    }],
  }
}

#[allow(unused)]
fn to_sign_psbt(to_spend_tx: Transaction, to_sign_tx: Transaction) -> Result<Psbt> {
  let mut psbt = Psbt::from_unsigned_tx(to_sign_tx).map_err(|err| anyhow!(err))?;
  psbt.inputs[0].witness_utxo = Some(TxOut {
    value: Amount::from_sat(0),
    script_pubkey: to_spend_tx.output[0].script_pubkey.clone(),
  });

  Ok(psbt)
}

pub fn sign(address: &Address, message: &str, wallet: &Wallet) -> String {
  let to_spend_tx = to_spend(address, message);
  let to_sign_tx = to_sign(to_spend_tx.clone());
  let mut psbt = to_sign_psbt(to_spend_tx.clone(), to_sign_tx).unwrap();

  let secp = Secp256k1::new();
  let private_key = wallet.private_key;
  let key_pair = Keypair::from_secret_key(&secp, &private_key.inner);
  let (x_only_public_key, _parity) = XOnlyPublicKey::from_keypair(&key_pair);

  psbt.inputs[0].tap_internal_key = Some(x_only_public_key);

  let sighash_type = TapSighashType::All;

  let mut sighash_cache = SighashCache::new(psbt.unsigned_tx.clone());

  let sighash = sighash_cache
    .taproot_key_spend_signature_hash(
      0,
      &sighash::Prevouts::All(&[TxOut {
        value: Amount::from_sat(0),
        script_pubkey: to_spend_tx.output[0].clone().script_pubkey,
      }]),
      sighash_type,
    )
    .expect("signature hash should compute");

  let key_pair = key_pair
    .tap_tweak(&secp, psbt.inputs[0].tap_merkle_root)
    .to_inner();

  let sig = secp.sign_schnorr_no_aux_rand(
    &secp256k1::Message::from_digest_slice(sighash.as_ref())
      .expect("should be cryptographically secure hash"),
    &key_pair,
  );

  let witness = sighash_cache
    .witness_mut(0)
    .expect("getting mutable witness reference should work");

  witness.push(
    bitcoin::taproot::Signature {
      sig,
      hash_ty: sighash_type,
    }
    .to_vec(),
  );

  let mut buffer = Vec::new();
  witness.consensus_encode(&mut buffer).unwrap();

  general_purpose::STANDARD.encode(buffer)
}

pub fn verify(address: &Address, message: &str, signature: &str) -> bool {
  let to_spend_tx = to_spend(address, message);
  let to_sign_tx = to_sign(to_spend_tx.clone());

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

  let mut sighash_cache = SighashCache::new(to_sign_tx);

  let sighash = sighash_cache
    .taproot_key_spend_signature_hash(
      0,
      &sighash::Prevouts::All(&[TxOut {
        value: Amount::from_sat(0),
        script_pubkey: to_spend_tx.output[0].clone().script_pubkey,
      }]),
      sighash_type,
    )
    .expect("signature hash should compute");

  let message = Message::from_digest_slice(sighash.as_ref()).unwrap();

  Secp256k1::verification_only()
    .verify_schnorr(&signature, &message, &pub_key)
    .is_ok()
}

#[cfg(test)]
mod tests {
  use super::*;

  /// From https://github.com/bitcoin/bips/blob/master/bip-0322.mediawiki#test-vectors
  /// and https://github.com/ACken2/bip322-js/blob/main/test/Verifier.test.ts
  /// and https://github.com/bitcoin/bitcoin/blob/29b28d07fa958b89e1c7916fda5d8654474cf495/src/test/util_tests.cpp#L2747

  const WIF_PRIVATE_KEY: &str = "L3VFeEujGtevx9w18HD1fhRbCH67Az2dpCymeRE1SoPK6XQtaN2k";
  const SEGWIT_ADDRESS: &str = "bc1q9vza2e8x573nczrlzms0wvx3gsqjx7vavgkx0l";
  const TAPROOT_ADDRESS: &str = "bc1ppv609nr0vr25u07u95waq5lucwfm6tde4nydujnu8npg4q75mr5sxq8lt3";

  #[test]
  fn message_hashes_are_correct() {
    assert_eq!(
      hex::encode(message_hash("")),
      "c90c269c4f8fcbe6880f72a721ddfbf1914268a794cbb21cfafee13770ae19f1"
    );

    assert_eq!(
      hex::encode(message_hash("Hello World")),
      "f0eb03b1a75ac6d9847f55c624a99169b5dccba2a31f5b23bea77ba270de0a7a"
    );
  }

  #[test]
  fn to_spend_txids_correct() {
    assert_eq!(
      to_spend(
        &Address::from_str(SEGWIT_ADDRESS).unwrap().assume_checked(),
        ""
      )
      .txid()
      .to_string(),
      "c5680aa69bb8d860bf82d4e9cd3504b55dde018de765a91bb566283c545a99a7"
    );

    assert_eq!(
      to_spend(
        &Address::from_str(SEGWIT_ADDRESS).unwrap().assume_checked(),
        "Hello World"
      )
      .txid()
      .to_string(),
      "b79d196740ad5217771c1098fc4a4b51e0535c32236c71f1ea4d61a2d603352b"
    );
  }

  #[test]
  fn to_sign_txids_correct() {
    assert_eq!(
      to_sign(to_spend(
        &Address::from_str(SEGWIT_ADDRESS).unwrap().assume_checked(),
        ""
      ))
      .txid()
      .to_string(),
      "1e9654e951a5ba44c8604c4de6c67fd78a27e81dcadcfe1edf638ba3aaebaed6"
    );

    assert_eq!(
      to_sign(to_spend(
        &Address::from_str(SEGWIT_ADDRESS).unwrap().assume_checked(),
        "Hello World"
      ))
      .txid()
      .to_string(),
      "88737ae86f2077145f93cc4b153ae9a1cb8d56afa511988c149c5c8c9d93bddf"
    );
  }

  #[test]
  fn verify_and_falsify_taproot() {
    assert!(verify(
      &Address::from_str(TAPROOT_ADDRESS).unwrap().assume_checked(),
      "Hello World",
      "AUHd69PrJQEv+oKTfZ8l+WROBHuy9HKrbFCJu7U1iK2iiEy1vMU5EfMtjc+VSHM7aU0SDbak5IUZRVno2P5mjSafAQ=="
    ),);

    assert!(!verify(
      &Address::from_str(TAPROOT_ADDRESS).unwrap().assume_checked(),
      "Hello World -- This should fail",
      "AUHd69PrJQEv+oKTfZ8l+WROBHuy9HKrbFCJu7U1iK2iiEy1vMU5EfMtjc+VSHM7aU0SDbak5IUZRVno2P5mjSafAQ=="
    ),);
  }

  #[test]
  fn sign_taproot() {
    let wallet = Wallet::new(WIF_PRIVATE_KEY);

    let signature = sign(
      &Address::from_str(TAPROOT_ADDRESS).unwrap().assume_checked(),
      "Hello World",
      &wallet,
    );

    assert_eq!(
      signature,
      "AUHd69PrJQEv+oKTfZ8l+WROBHuy9HKrbFCJu7U1iK2iiEy1vMU5EfMtjc+VSHM7aU0SDbak5IUZRVno2P5mjSafAQ=="
    );
  }

  #[test]
  fn roundtrip_taproot() {
    let wallet = Wallet::new(WIF_PRIVATE_KEY);

    assert!(verify(
      &Address::from_str(TAPROOT_ADDRESS).unwrap().assume_checked(),
      "Hello World",
      &sign(
        &Address::from_str(TAPROOT_ADDRESS).unwrap().assume_checked(),
        "Hello World",
        &wallet
      )
    ));
  }
}
