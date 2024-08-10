use {
  base64::{engine::general_purpose, Engine},
  bitcoin::{
    absolute::LockTime,
    address::AddressType,
    blockdata::script,
    consensus::Decodable,
    consensus::Encodable,
    key::{Keypair, TapTweak},
    opcodes,
    psbt::Psbt,
    script::PushBytes,
    secp256k1::{self, schnorr::Signature, Message, Secp256k1, XOnlyPublicKey},
    sighash::{self, SighashCache, TapSighashType},
    transaction::Version,
    Address, Amount, Network, OutPoint, PrivateKey, PublicKey, ScriptBuf, Sequence, Transaction,
    TxIn, TxOut, Witness,
  },
  bitcoin_hashes::{sha256, Hash},
  error::Error,
  snafu::{ResultExt, Snafu},
  std::{io::Cursor, str::FromStr},
};

mod error;
mod sign;
mod verify;

pub use {
  sign::{full_sign, simple_sign},
  verify::{full_verify, simple_verify},
};

const TAG: &str = "BIP0322-signed-message";

type Result<T = (), E = Error> = std::result::Result<T, E>;

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

// message_hash = sha256(sha256(tag) || sha256(tag) || message); see BIP340
pub(crate) fn message_hash(message: &[u8]) -> Vec<u8> {
  let mut tag_hash = sha256::Hash::hash(TAG.as_bytes()).to_byte_array().to_vec();
  tag_hash.extend(tag_hash.clone());
  tag_hash.extend(message);

  sha256::Hash::hash(tag_hash.as_slice())
    .to_byte_array()
    .to_vec()
}

pub(crate) fn create_to_spend(address: &Address, message: &[u8]) -> Transaction {
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

pub(crate) fn create_to_sign(to_spend: &Transaction, witness: Option<Witness>) -> Psbt {
  let inputs = vec![TxIn {
    previous_output: OutPoint {
      txid: to_spend.txid(),
      vout: 0,
    },
    script_sig: ScriptBuf::new(),
    sequence: Sequence(0),
    witness: Witness::new(),
  }];

  let to_sign = Transaction {
    version: Version(0),
    lock_time: LockTime::ZERO,
    input: inputs,
    output: vec![TxOut {
      value: Amount::from_sat(0),
      script_pubkey: script::Builder::new()
        .push_opcode(opcodes::all::OP_RETURN)
        .into_script(),
    }],
  };

  let mut psbt = Psbt::from_unsigned_tx(to_sign).unwrap(); // TODO

  psbt.inputs[0].witness_utxo = Some(TxOut {
    value: Amount::from_sat(0),
    script_pubkey: to_spend.output[0].script_pubkey.clone(),
  });

  psbt.inputs[0].final_script_witness = witness;

  psbt
}

#[cfg(test)]
mod tests {
  use {super::*, pretty_assertions::assert_eq};

  /// From https://github.com/bitcoin/bips/blob/master/bip-0322.mediawiki#test-vectors
  /// and https://github.com/ACken2/bip322-js/blob/main/test/Verifier.test.ts
  /// and https://github.com/bitcoin/bitcoin/blob/29b28d07fa958b89e1c7916fda5d8654474cf495/src/test/util_tests.cpp#L2747

  const WIF_PRIVATE_KEY: &str = "L3VFeEujGtevx9w18HD1fhRbCH67Az2dpCymeRE1SoPK6XQtaN2k";
  const SEGWIT_ADDRESS: &str = "bc1q9vza2e8x573nczrlzms0wvx3gsqjx7vavgkx0l";
  const TAPROOT_ADDRESS: &str = "bc1ppv609nr0vr25u07u95waq5lucwfm6tde4nydujnu8npg4q75mr5sxq8lt3";

  #[test]
  fn message_hashes_are_correct() {
    assert_eq!(
      hex::encode(message_hash("".as_bytes())),
      "c90c269c4f8fcbe6880f72a721ddfbf1914268a794cbb21cfafee13770ae19f1"
    );

    assert_eq!(
      hex::encode(message_hash("Hello World".as_bytes())),
      "f0eb03b1a75ac6d9847f55c624a99169b5dccba2a31f5b23bea77ba270de0a7a"
    );
  }

  #[test]
  fn to_spend_txids_correct() {
    assert_eq!(
      create_to_spend(
        &Address::from_str(SEGWIT_ADDRESS).unwrap().assume_checked(),
        "".as_bytes()
      )
      .txid()
      .to_string(),
      "c5680aa69bb8d860bf82d4e9cd3504b55dde018de765a91bb566283c545a99a7"
    );

    assert_eq!(
      create_to_spend(
        &Address::from_str(SEGWIT_ADDRESS).unwrap().assume_checked(),
        "Hello World".as_bytes()
      )
      .txid()
      .to_string(),
      "b79d196740ad5217771c1098fc4a4b51e0535c32236c71f1ea4d61a2d603352b"
    );
  }

  #[test]
  fn to_sign_txids_correct() {
    let to_spend = create_to_spend(
      &Address::from_str(SEGWIT_ADDRESS).unwrap().assume_checked(),
      "".as_bytes(),
    );
    let to_sign = create_to_sign(&to_spend, None);
    assert_eq!(
      to_sign.unsigned_tx.txid().to_string(),
      "1e9654e951a5ba44c8604c4de6c67fd78a27e81dcadcfe1edf638ba3aaebaed6"
    );

    let to_spend = create_to_spend(
      &Address::from_str(SEGWIT_ADDRESS).unwrap().assume_checked(),
      "Hello World".as_bytes(),
    );
    let to_sign = create_to_sign(&to_spend, None);
    assert_eq!(
      to_sign.unsigned_tx.txid().to_string(),
      "88737ae86f2077145f93cc4b153ae9a1cb8d56afa511988c149c5c8c9d93bddf"
    );
  }

  #[test]
  fn simple_verify_and_falsify_taproot() {
    assert!(
      simple_verify(
        TAPROOT_ADDRESS,
        "Hello World", 
        "AUHd69PrJQEv+oKTfZ8l+WROBHuy9HKrbFCJu7U1iK2iiEy1vMU5EfMtjc+VSHM7aU0SDbak5IUZRVno2P5mjSafAQ=="
      ).is_ok()
    );

    assert_eq!(
      simple_verify(
        TAPROOT_ADDRESS,
        "Hello World -- This should fail",
        "AUHd69PrJQEv+oKTfZ8l+WROBHuy9HKrbFCJu7U1iK2iiEy1vMU5EfMtjc+VSHM7aU0SDbak5IUZRVno2P5mjSafAQ=="
      ).unwrap_err().to_string(),
      "Invalid"
    );
  }

  #[test]
  fn simple_sign_taproot() {
    let wallet = Wallet::new(WIF_PRIVATE_KEY);

    let signature = simple_sign(
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
  fn roundtrip_taproot_simple() {
    let wallet = Wallet::new(WIF_PRIVATE_KEY);

    assert!(simple_verify(
      TAPROOT_ADDRESS,
      "Hello World",
      &simple_sign(
        &Address::from_str(TAPROOT_ADDRESS).unwrap().assume_checked(),
        "Hello World",
        &wallet
      )
    )
    .is_ok());
  }

  #[test]
  fn roundtrip_taproot_full() {
    let wallet = Wallet::new(WIF_PRIVATE_KEY);

    assert!(full_verify(
      TAPROOT_ADDRESS,
      "Hello World",
      &full_sign(
        &Address::from_str(TAPROOT_ADDRESS).unwrap().assume_checked(),
        "Hello World",
        &wallet
      )
    )
    .is_ok());
  }

  #[test]
  fn invalid_address() {
    assert_eq!(simple_verify(
      "3B5fQsEXEaV8v6U3ejYc8XaKXAkyQj2MjV",
      "",
      "AkcwRAIgM2gBAQqvZX15ZiysmKmQpDrG83avLIT492QBzLnQIxYCIBaTpOaD20qRlEylyxFSeEA2ba9YOixpX8z46TSDtS40ASECx/EgAxlkQpQ9hYjgGu6EBCPMVPwVIVJqO4XCsMvViHI=").unwrap_err().to_string(),
      "Unsuported address `3B5fQsEXEaV8v6U3ejYc8XaKXAkyQj2MjV`, only P2TR allowed"
    )
  }

  #[test]
  fn signature_decode_error() {
    assert_eq!(
      simple_verify(
        TAPROOT_ADDRESS,
        "Hello World",
        "invalid signature not in base64 encoding"
      )
      .unwrap_err()
      .to_string(),
      "Decode error for signature `invalid signature not in base64 encoding`"
    );

    assert_eq!(
      simple_verify(
        TAPROOT_ADDRESS,
        "Hello World", 
        "AkcwRAIgM2gBAQqvZX15ZiysmKmQpDrG83avLIT492QBzLnQIxYCIBaTpOaD20qRlEylyxFSeEA2ba9YOixpX8z46TSDtS40ASECx/EgAxlkQpQ9hYjgGu6EBCPMVPwVIVJqO4XCsMvViH"
      ).unwrap_err().to_string(),
      "Decode error for signature `AkcwRAIgM2gBAQqvZX15ZiysmKmQpDrG83avLIT492QBzLnQIxYCIBaTpOaD20qRlEylyxFSeEA2ba9YOixpX8z46TSDtS40ASECx/EgAxlkQpQ9hYjgGu6EBCPMVPwVIVJqO4XCsMvViH`"
    )
  }
}
