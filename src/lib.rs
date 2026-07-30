use {
  base64::{engine::general_purpose, Engine},
  bitcoin::{
    absolute::LockTime,
    address::AddressData,
    blockdata::script,
    consensus::Decodable,
    consensus::Encodable,
    hashes::Hash,
    key::{Keypair, TapTweak},
    opcodes,
    psbt::Psbt,
    script::{Instruction, PushBytes, PushBytesBuf},
    secp256k1::{self, schnorr::Signature, Message, Secp256k1, XOnlyPublicKey},
    sighash::{self, SighashCache, TapSighashType},
    sign_message::{signed_msg_hash, MessageSignature},
    transaction::Version,
    Address, Amount, EcdsaSighashType, OutPoint, PrivateKey, PublicKey, ScriptBuf, Sequence,
    Transaction, TxIn, TxOut, Witness,
  },
  sha2::{Digest, Sha256},
  snafu::{ResultExt, Snafu},
  std::str::FromStr,
};

mod error;
mod sign;
mod util;
mod verify;

pub use {error::Error, sign::*, util::*, verify::*};

type Result<T = (), E = Error> = std::result::Result<T, E>;

#[cfg(test)]
mod tests {
  use {super::*, pretty_assertions::assert_eq, rand::RngCore};

  // From https://github.com/bitcoin/bips/blob/master/bip-0322.mediawiki#test-vectors
  // and https://github.com/ACken2/bip322-js/blob/main/test/Verifier.test.ts
  // and https://github.com/bitcoin/bitcoin/blob/29b28d07fa958b89e1c7916fda5d8654474cf495/src/test/util_tests.cpp#L2747
  // and https://github.com/bitcoin/bips/blob/master/bip-0322/generated-test-vectors.json
  // (with the smp/ful signature variant prefixes stripped)

  const WIF_PRIVATE_KEY: &str = "L3VFeEujGtevx9w18HD1fhRbCH67Az2dpCymeRE1SoPK6XQtaN2k";
  const SEGWIT_ADDRESS: &str = "bc1q9vza2e8x573nczrlzms0wvx3gsqjx7vavgkx0l";
  const TAPROOT_ADDRESS: &str = "bc1ppv609nr0vr25u07u95waq5lucwfm6tde4nydujnu8npg4q75mr5sxq8lt3";
  const LEGACY_ADDRESS: &str = "14vV3aCHBeStb5bkenkNHbe2YAFinYdXgc";

  const NESTED_SEGWIT_WIF_PRIVATE_KEY: &str =
    "KwTbAxmBXjoZM3bzbXixEr9nxLhyYSM4vp2swet58i19bw9sqk5z";
  const NESTED_SEGWIT_ADDRESS: &str = "3HSVzEhCFuH9Z3wvoWTexy7BMVVp3PjS6f";

  const P2WSH_2OF2_ADDRESS: &str = "bc1qg8r3cl47rrr75dwvr7jhzdukptegnmq8v0nmjd2jdn4qvlczqkts0rqtav";
  const P2WSH_2OF2_WITNESS_SCRIPT: &str =
    "52210244f7cb842a4ce4f352ce4062ae5e0a5d60d6faa0b07b62c2063484aa5297bbce210234eed6190efc47716b953a050b563f8b2b523addea955ae43351dd2a92aa49f452ae";
  const P2WSH_2OF2_PRIVATE_KEY_1: &str = "L14bn1tSDZUKYLLiTConCRHbqzGef8eqB2tU5PBPFBkyPLUyob7V";
  const P2WSH_2OF2_PRIVATE_KEY_2: &str = "KyJnWYygb7P2P8khWyDMW9yFGA3dUe7kpkEHtLbzY6cfvvn9T5CS";
  const P2WSH_2OF2_MESSAGE: &str = "QXYOWYWO7ZGJC4OPNC367HBUQF";

  const P2SH_P2WSH_2OF2_ADDRESS: &str = "3PGZjFkYBL1m9WBWkWbCW5FEFTaS1Hj4EB";
  const P2SH_P2WSH_2OF2_WITNESS_SCRIPT: &str =
    "522103fb824153fc000a213c5456d01780d1f292a0cfbfbc5f6f8f1dc713706c5519d12103db88ce9fb8081e50460beb37539741b0667d6f2439dd1ca283d63182421c10b152ae";
  const P2SH_P2WSH_2OF2_PRIVATE_KEY_1: &str =
    "L246N8J5x5ehwjoz97ZfHXBCELxGcK2jqRFinReMBcRnqH1X4zdc";
  const P2SH_P2WSH_2OF2_PRIVATE_KEY_2: &str =
    "L1WzdMN476EHhwsDLHJwVHZKrwVLFFsdvNoZFsZVk2Mb5rKst2Et";
  const P2SH_P2WSH_2OF2_MESSAGE: &str = "NQVRV3DJYLKBANM3OPTNBULEU3";

  const UNCOMPRESSED_WIF_PRIVATE_KEY: &str = "5HpHagT65TZzG1PH3CSu63k8DbpvD8s5ip4nEB3kEsreAnchuDf";

  const P2SH_MULTISIG_2OF2_ADDRESS: &str = "3Nye4j1GUFqCEBR3do2KEFZAs9oLe8NZ6X";
  const P2SH_MULTISIG_2OF2_REDEEM_SCRIPT: &str =
    "52210384a8dc6ff3efd7fec062eb73397c2079cd3cc300ff57088f9b9f0b734c63a21821021c9c8e9c1d06e3f7de8ad05c01f5080b2b81292eb29c4cdbe14f43838256141652ae";
  const P2SH_MULTISIG_2OF2_PRIVATE_KEY_1: &str =
    "L5Teubyzf4mFSMHGCzADK42oRi9xz45qhBrYx2Xs8uCY6WyrymT5";
  const P2SH_MULTISIG_2OF2_PRIVATE_KEY_2: &str =
    "L4HsBh1Rb5DWP5Hf82tPw3whgwFyt8hdRTChxZQE4HzWfdbVgiWT";

  // PoF constants
  const POF_P2TR_ADDRESS: &str = "bc1pk3vq3wpn4txexwq4dj0k2dugzp6kfwllvs89w49cvtk3j2cndcds3l9kw9";
  const POF_P2TR_CHALLENGE_KEY: &str = "L1p7QRghEregYbBvSCp1eW4YJg2RwMYwX2uhR1eAnkVoPJBaJ7Dy";
  const POF_P2TR_PROVEN_KEY_1: &str = "Kz5jBiqQKoppYvaxtWZJicxGZ3G3iJ4rLqNnv7MaQBusyoE731EJ";
  const POF_P2TR_PROVEN_KEY_2: &str = "L2fNJduiUkSytUDbxa58ivWoHevB3svcWUJMxMFebdugYP5jgJr1";
  const POF_P2TR_PROVEN_KEY_3: &str = "KxqVMn81AEYSwYuzBxe6xC4JDAgA2eU2qiNvBAgVZZwRFv1BqN3y";
  const POF_P2TR_MESSAGE: &str = "FUYMQWKYGS7HJEN7YFEZU5SNR5";

  #[test]
  fn message_hashes_are_correct() {
    assert_eq!(
      hex::encode(tagged_hash(BIP322_TAG, "")),
      "c90c269c4f8fcbe6880f72a721ddfbf1914268a794cbb21cfafee13770ae19f1"
    );

    assert_eq!(
      hex::encode(tagged_hash(BIP322_TAG, "Hello World")),
      "f0eb03b1a75ac6d9847f55c624a99169b5dccba2a31f5b23bea77ba270de0a7a"
    );
  }

  #[test]
  fn to_spend_txids_correct() {
    assert_eq!(
      create_to_spend(
        &Address::from_str(SEGWIT_ADDRESS).unwrap().assume_checked(),
        ""
      )
      .unwrap()
      .compute_txid()
      .to_string(),
      "c5680aa69bb8d860bf82d4e9cd3504b55dde018de765a91bb566283c545a99a7"
    );

    assert_eq!(
      create_to_spend(
        &Address::from_str(SEGWIT_ADDRESS).unwrap().assume_checked(),
        "Hello World"
      )
      .unwrap()
      .compute_txid()
      .to_string(),
      "b79d196740ad5217771c1098fc4a4b51e0535c32236c71f1ea4d61a2d603352b"
    );
  }

  #[test]
  fn to_sign_txids_correct() {
    let to_spend = create_to_spend(
      &Address::from_str(SEGWIT_ADDRESS).unwrap().assume_checked(),
      "",
    )
    .unwrap();

    let to_sign = create_to_sign(&to_spend, None).unwrap();

    assert_eq!(
      to_sign.unsigned_tx.compute_txid().to_string(),
      "1e9654e951a5ba44c8604c4de6c67fd78a27e81dcadcfe1edf638ba3aaebaed6"
    );

    let to_spend = create_to_spend(
      &Address::from_str(SEGWIT_ADDRESS).unwrap().assume_checked(),
      "Hello World",
    )
    .unwrap();

    let to_sign = create_to_sign(&to_spend, None).unwrap();

    assert_eq!(
      to_sign.unsigned_tx.compute_txid().to_string(),
      "88737ae86f2077145f93cc4b153ae9a1cb8d56afa511988c149c5c8c9d93bddf"
    );
  }

  #[test]
  fn simple_verify_and_falsify_taproot() {
    assert!(
      verify::verify_simple_encoded(
        TAPROOT_ADDRESS,
        "Hello World",
        "AUHd69PrJQEv+oKTfZ8l+WROBHuy9HKrbFCJu7U1iK2iiEy1vMU5EfMtjc+VSHM7aU0SDbak5IUZRVno2P5mjSafAQ=="
      ).is_ok()
    );

    assert_eq!(
      verify::verify_simple_encoded(
        TAPROOT_ADDRESS,
        "Hello World -- This should fail",
        "AUHd69PrJQEv+oKTfZ8l+WROBHuy9HKrbFCJu7U1iK2iiEy1vMU5EfMtjc+VSHM7aU0SDbak5IUZRVno2P5mjSafAQ=="
      ).unwrap_err().to_string(),
      "Invalid signature"
    );
  }

  #[test]
  fn simple_sign_taproot() {
    assert_eq!(
      sign::sign_simple_encoded(TAPROOT_ADDRESS, "Hello World", &[WIF_PRIVATE_KEY], None).unwrap(),
      "AUHd69PrJQEv+oKTfZ8l+WROBHuy9HKrbFCJu7U1iK2iiEy1vMU5EfMtjc+VSHM7aU0SDbak5IUZRVno2P5mjSafAQ=="
    );
  }

  #[test]
  fn roundtrip_taproot_simple() {
    assert!(verify::verify_simple_encoded(
      TAPROOT_ADDRESS,
      "Hello World",
      &sign::sign_simple_encoded(TAPROOT_ADDRESS, "Hello World", &[WIF_PRIVATE_KEY], None).unwrap()
    )
    .is_ok());
  }

  #[test]
  fn roundtrip_taproot_full() {
    assert!(verify::verify_full_encoded(
      TAPROOT_ADDRESS,
      "Hello World",
      &sign::sign_full_encoded(TAPROOT_ADDRESS, "Hello World", &[WIF_PRIVATE_KEY], None).unwrap()
    )
    .is_ok());
  }

  #[test]
  fn signature_decode_error() {
    assert_eq!(
      verify::verify_simple_encoded(
        TAPROOT_ADDRESS,
        "Hello World",
        "invalid signature not in base64 encoding"
      )
      .unwrap_err()
      .to_string(),
      "Decode error for signature `invalid signature not in base64 encoding`"
    );

    assert_eq!(
      verify::verify_simple_encoded(
        TAPROOT_ADDRESS,
        "Hello World",
        "AkcwRAIgM2gBAQqvZX15ZiysmKmQpDrG83avLIT492QBzLnQIxYCIBaTpOaD20qRlEylyxFSeEA2ba9YOixpX8z46TSDtS40ASECx/EgAxlkQpQ9hYjgGu6EBCPMVPwVIVJqO4XCsMvViH"
      ).unwrap_err().to_string(),
      "Decode error for signature `AkcwRAIgM2gBAQqvZX15ZiysmKmQpDrG83avLIT492QBzLnQIxYCIBaTpOaD20qRlEylyxFSeEA2ba9YOixpX8z46TSDtS40ASECx/EgAxlkQpQ9hYjgGu6EBCPMVPwVIVJqO4XCsMvViH`"
    )
  }

  #[test]
  fn simple_verify_and_falsify_p2wpkh() {
    assert!(
      verify::verify_simple_encoded(
        SEGWIT_ADDRESS,
        "Hello World",
        "AkcwRAIgZRfIY3p7/DoVTty6YZbWS71bc5Vct9p9Fia83eRmw2QCICK/ENGfwLtptFluMGs2KsqoNSk89pO7F29zJLUx9a/sASECx/EgAxlkQpQ9hYjgGu6EBCPMVPwVIVJqO4XCsMvViHI="
      ).is_ok()
    );

    assert!(
      verify::verify_simple_encoded(
        SEGWIT_ADDRESS,
        "Hello World - this should fail",
        "AkcwRAIgZRfIY3p7/DoVTty6YZbWS71bc5Vct9p9Fia83eRmw2QCICK/ENGfwLtptFluMGs2KsqoNSk89pO7F29zJLUx9a/sASECx/EgAxlkQpQ9hYjgGu6EBCPMVPwVIVJqO4XCsMvViHI="
      ).is_err()
    );

    assert!(
      verify::verify_simple_encoded(
        SEGWIT_ADDRESS,
        "Hello World",
        "AkgwRQIhAOzyynlqt93lOKJr+wmmxIens//zPzl9tqIOua93wO6MAiBi5n5EyAcPScOjf1lAqIUIQtr3zKNeavYabHyR8eGhowEhAsfxIAMZZEKUPYWI4BruhAQjzFT8FSFSajuFwrDL1Yhy"
      ).is_ok()
    );

    assert!(
      verify::verify_simple_encoded(
        SEGWIT_ADDRESS,
        "",
        "AkcwRAIgM2gBAQqvZX15ZiysmKmQpDrG83avLIT492QBzLnQIxYCIBaTpOaD20qRlEylyxFSeEA2ba9YOixpX8z46TSDtS40ASECx/EgAxlkQpQ9hYjgGu6EBCPMVPwVIVJqO4XCsMvViHI="
      ).is_ok()
    );

    assert!(
      verify::verify_simple_encoded(
        SEGWIT_ADDRESS,
        "fail",
        "AkcwRAIgM2gBAQqvZX15ZiysmKmQpDrG83avLIT492QBzLnQIxYCIBaTpOaD20qRlEylyxFSeEA2ba9YOixpX8z46TSDtS40ASECx/EgAxlkQpQ9hYjgGu6EBCPMVPwVIVJqO4XCsMvViHI="
      ).is_err()
    );

    assert!(
      verify::verify_simple_encoded(
        SEGWIT_ADDRESS,
        "",
        "AkgwRQIhAPkJ1Q4oYS0htvyuSFHLxRQpFAY56b70UvE7Dxazen0ZAiAtZfFz1S6T6I23MWI2lK/pcNTWncuyL8UL+oMdydVgzAEhAsfxIAMZZEKUPYWI4BruhAQjzFT8FSFSajuFwrDL1Yhy"
      ).is_ok()
    );
  }

  #[test]
  fn verify_p2wpkh_signature_shorter_than_71_bytes() {
    // ECDSA signatures are not fixed length: this signature's DER encoding is 69
    // bytes (r serializes to 31 bytes), i.e. 70 bytes with the sighash flag, below
    // the usual 71/72. It is valid and `sign_simple` produces it, so `verify`
    // must accept it. Regenerate with:
    //   sign::sign_simple_encoded(SEGWIT_ADDRESS, "probe-266", WIF_PRIVATE_KEY)
    assert!(
      verify::verify_simple_encoded(
        SEGWIT_ADDRESS,
        "probe-266",
        "AkYwQwIgdHvqo7c5BbXCr0O5xWkT1qoihgF5oaKXoFlzuegR+ZICHxoQGPcMKj+iUTymjR5tC+uN7arZcZHUv7BMyf6rwJoBIQLH8SADGWRClD2FiOAa7oQEI8xU/BUhUmo7hcKwy9WIcg=="
      ).is_ok()
    );
  }

  #[test]
  fn simple_sign_p2wpkh() {
    assert_eq!(
      sign::sign_simple_encoded(SEGWIT_ADDRESS, "Hello World", &[WIF_PRIVATE_KEY], None).unwrap(),
      "AkgwRQIhAOzyynlqt93lOKJr+wmmxIens//zPzl9tqIOua93wO6MAiBi5n5EyAcPScOjf1lAqIUIQtr3zKNeavYabHyR8eGhowEhAsfxIAMZZEKUPYWI4BruhAQjzFT8FSFSajuFwrDL1Yhy"
    );

    assert_eq!(
      sign::sign_simple_encoded(SEGWIT_ADDRESS, "", &[WIF_PRIVATE_KEY], None).unwrap(),
      "AkgwRQIhAPkJ1Q4oYS0htvyuSFHLxRQpFAY56b70UvE7Dxazen0ZAiAtZfFz1S6T6I23MWI2lK/pcNTWncuyL8UL+oMdydVgzAEhAsfxIAMZZEKUPYWI4BruhAQjzFT8FSFSajuFwrDL1Yhy"
    );
  }

  #[test]
  fn roundtrip_p2wpkh_simple() {
    assert!(verify::verify_simple_encoded(
      SEGWIT_ADDRESS,
      "Hello World",
      &sign::sign_simple_encoded(SEGWIT_ADDRESS, "Hello World", &[WIF_PRIVATE_KEY], None).unwrap()
    )
    .is_ok());
  }

  #[test]
  fn roundtrip_p2wpkh_full() {
    assert!(verify::verify_full_encoded(
      SEGWIT_ADDRESS,
      "Hello World",
      &sign::sign_full_encoded(SEGWIT_ADDRESS, "Hello World", &[WIF_PRIVATE_KEY], None).unwrap()
    )
    .is_ok());
  }

  #[test]
  fn simple_verify_and_falsify_p2sh_p2wpkh() {
    assert!(verify::verify_simple_encoded(
        NESTED_SEGWIT_ADDRESS,
        "Hello World",
        "AkgwRQIhAMd2wZSY3x0V9Kr/NClochoTXcgDaGl3OObOR17yx3QQAiBVWxqNSS+CKen7bmJTG6YfJjsggQ4Fa2RHKgBKrdQQ+gEhAxa5UDdQCHSQHfKQv14ybcYm1C9y6b12xAuukWzSnS+w"
      ).is_ok()
    );

    assert!(verify::verify_simple_encoded(
        NESTED_SEGWIT_ADDRESS,
        "Hello World - this should fail",
        "AkgwRQIhAMd2wZSY3x0V9Kr/NClochoTXcgDaGl3OObOR17yx3QQAiBVWxqNSS+CKen7bmJTG6YfJjsggQ4Fa2RHKgBKrdQQ+gEhAxa5UDdQCHSQHfKQv14ybcYm1C9y6b12xAuukWzSnS+w"
      ).is_err()
    );
  }

  #[test]
  fn simple_sign_p2sh_p2wpkh() {
    assert_eq!(
      sign::sign_simple_encoded(NESTED_SEGWIT_ADDRESS, "Hello World", &[NESTED_SEGWIT_WIF_PRIVATE_KEY], None).unwrap(),
      "AkgwRQIhAMd2wZSY3x0V9Kr/NClochoTXcgDaGl3OObOR17yx3QQAiBVWxqNSS+CKen7bmJTG6YfJjsggQ4Fa2RHKgBKrdQQ+gEhAxa5UDdQCHSQHfKQv14ybcYm1C9y6b12xAuukWzSnS+w"
    );
  }

  #[test]
  fn roundtrip_p2sh_p2wpkh_simple() {
    assert!(verify::verify_simple_encoded(
      NESTED_SEGWIT_ADDRESS,
      "Hello World",
      &sign::sign_simple_encoded(
        NESTED_SEGWIT_ADDRESS,
        "Hello World",
        &[NESTED_SEGWIT_WIF_PRIVATE_KEY],
        None
      )
      .unwrap()
    )
    .is_ok());
  }

  #[test]
  fn roundtrip_p2sh_p2wpkh_full() {
    assert!(verify::verify_full_encoded(
      NESTED_SEGWIT_ADDRESS,
      "Hello World",
      &sign::sign_full_encoded(
        NESTED_SEGWIT_ADDRESS,
        "Hello World",
        &[NESTED_SEGWIT_WIF_PRIVATE_KEY],
        None
      )
      .unwrap()
    )
    .is_ok());
  }

  #[test]
  fn adding_aux_randomness_roundtrips() {
    let address = Address::from_str(TAPROOT_ADDRESS).unwrap().assume_checked();
    let message = "Hello World with aux randomness";
    let to_spend = create_to_spend(&address, message).unwrap();
    let to_sign = create_to_sign(&to_spend, None).unwrap();
    let private_key = PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap();

    let mut aux_rand = [0u8; 32];
    rand::rng().fill_bytes(&mut aux_rand);

    let prevouts = [TxOut {
      value: Amount::from_sat(0),
      script_pubkey: to_spend.output[0].script_pubkey.clone(),
    }];

    let witness =
      create_message_signature_taproot(&to_sign, &private_key, &prevouts, 0, Some(aux_rand))
        .unwrap();

    assert!(verify_simple(&address, message, witness).is_ok());
  }

  #[test]
  fn roundtrip_p2wsh_2of2_simple() {
    assert!(verify::verify_simple_encoded(
      P2WSH_2OF2_ADDRESS,
      P2WSH_2OF2_MESSAGE,
      &sign::sign_simple_encoded(
        P2WSH_2OF2_ADDRESS,
        P2WSH_2OF2_MESSAGE,
        &[P2WSH_2OF2_PRIVATE_KEY_1, P2WSH_2OF2_PRIVATE_KEY_2],
        Some(P2WSH_2OF2_WITNESS_SCRIPT),
      )
      .unwrap()
    )
    .is_ok());
  }

  #[test]
  fn roundtrip_p2sh_p2wsh_2of2_full() {
    assert!(verify::verify_full_encoded(
      P2SH_P2WSH_2OF2_ADDRESS,
      P2SH_P2WSH_2OF2_MESSAGE,
      &sign::sign_full_encoded(
        P2SH_P2WSH_2OF2_ADDRESS,
        P2SH_P2WSH_2OF2_MESSAGE,
        &[P2SH_P2WSH_2OF2_PRIVATE_KEY_1, P2SH_P2WSH_2OF2_PRIVATE_KEY_2],
        Some(P2SH_P2WSH_2OF2_WITNESS_SCRIPT),
      )
      .unwrap()
    )
    .is_ok());
  }

  #[test]
  fn roundtrip_p2wsh_2of2_shuffled_keys() {
    assert!(verify::verify_simple_encoded(
      P2WSH_2OF2_ADDRESS,
      P2WSH_2OF2_MESSAGE,
      &sign::sign_simple_encoded(
        P2WSH_2OF2_ADDRESS,
        P2WSH_2OF2_MESSAGE,
        &[P2WSH_2OF2_PRIVATE_KEY_2, P2WSH_2OF2_PRIVATE_KEY_1],
        Some(P2WSH_2OF2_WITNESS_SCRIPT),
      )
      .unwrap()
    )
    .is_ok());
  }

  #[test]
  fn roundtrip_p2sh_p2wsh_2of2_shuffled_keys() {
    assert!(verify::verify_full_encoded(
      P2SH_P2WSH_2OF2_ADDRESS,
      P2SH_P2WSH_2OF2_MESSAGE,
      &sign::sign_full_encoded(
        P2SH_P2WSH_2OF2_ADDRESS,
        P2SH_P2WSH_2OF2_MESSAGE,
        &[P2SH_P2WSH_2OF2_PRIVATE_KEY_2, P2SH_P2WSH_2OF2_PRIVATE_KEY_1],
        Some(P2SH_P2WSH_2OF2_WITNESS_SCRIPT),
      )
      .unwrap()
    )
    .is_ok())
  }

  #[test]
  fn roundtrip_p2pkh_full() {
    assert!(verify::verify_full_encoded(
      LEGACY_ADDRESS,
      "Hello World",
      &sign::sign_full_encoded(LEGACY_ADDRESS, "Hello World", &[WIF_PRIVATE_KEY], None).unwrap()
    )
    .is_ok());
  }

  #[test]
  fn multisig_rejects_unknown_signer() {
    assert!(matches!(
      sign::sign_simple_encoded(
        P2WSH_2OF2_ADDRESS,
        P2WSH_2OF2_MESSAGE,
        &[P2WSH_2OF2_PRIVATE_KEY_1, WIF_PRIVATE_KEY],
        Some(P2WSH_2OF2_WITNESS_SCRIPT),
      ),
      Err(Error::UnknownSigner)
    ));
  }

  #[test]
  fn multisig_rejects_mismatched_witness_script() {
    assert!(matches!(
      sign::sign_simple_encoded(
        P2WSH_2OF2_ADDRESS,
        "foo",
        &[P2WSH_2OF2_PRIVATE_KEY_1, P2WSH_2OF2_PRIVATE_KEY_2],
        Some(P2SH_P2WSH_2OF2_WITNESS_SCRIPT),
      ),
      Err(Error::UnsupportedAddress { .. })
    ));
  }

  #[test]
  fn p2pkh_simple_unsupported() {
    assert!(matches!(
      sign::sign_simple_encoded(LEGACY_ADDRESS, "Hello World", &[WIF_PRIVATE_KEY], None),
      Err(Error::UnsupportedAddress { .. })
    ));
  }

  #[test]
  fn single_sig_rejects_extra_keys() {
    assert!(matches!(
      sign::sign_simple_encoded(
        SEGWIT_ADDRESS,
        "foo",
        &[WIF_PRIVATE_KEY, WIF_PRIVATE_KEY],
        None
      ),
      Err(Error::SignatureCount {
        required: 1,
        provided: 2
      })
    ));
  }

  #[test]
  fn p2sh_rejects_uncompressed_key() {
    assert!(matches!(
      sign::sign_simple_encoded(
        NESTED_SEGWIT_ADDRESS,
        "foo",
        &[UNCOMPRESSED_WIF_PRIVATE_KEY],
        None
      ),
      Err(Error::UncompressedPublicKey { .. })
    ));
  }

  #[test]
  fn verify_full_rejects_noncanonical_to_sign() {
    #[track_caller]
    fn case(mutate: impl Fn(&mut Transaction)) {
      let address = Address::from_str(SEGWIT_ADDRESS).unwrap().assume_checked();

      let mut to_sign = sign::sign_full(
        &address,
        "foo",
        &[PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap()],
        None,
      )
      .unwrap();

      mutate(&mut to_sign);

      assert!(matches!(
        verify::verify_full(&address, "foo", to_sign),
        Err(Error::ToSignInvalid)
      ));
    }

    case(|tx| tx.version = Version(3));
    case(|tx| {
      let input = tx.input[0].clone();
      tx.input.push(input);
    });
    case(|tx| {
      let output = tx.output[0].clone();
      tx.output.push(output);
    });
    case(|tx| tx.input[0].script_sig = ScriptBuf::from_hex("deadbeef").unwrap());
    case(|tx| tx.output[0].value = Amount::from_sat(1));
    case(|tx| tx.output[0].script_pubkey = ScriptBuf::new());
  }

  #[test]
  fn verify_full_rejects_inputless_transaction() {
    let to_sign = Transaction {
      version: Version(0),
      lock_time: LockTime::ZERO,
      input: Vec::new(),
      output: Vec::new(),
    };

    assert!(matches!(
      verify::verify_full(
        &Address::from_str(TAPROOT_ADDRESS).unwrap().assume_checked(),
        "foo",
        to_sign
      ),
      Err(Error::ToSignInvalid)
    ));
  }

  #[test]
  fn official_vectors_simple() {
    #[track_caller]
    fn case(address: &str, message: &str, signature: &str) {
      assert!(verify::verify_simple_encoded(address, message, signature).is_ok());
    }

    case("bc1qqthe0hz8klx90e7stf6shclhsvqd5ly96pn53v", "2V6TUTMSH4VQ3Z7WZWKYD7DFNH", "AkgwRQIhALC6hdfxNy1n45d7UXSskRBdfZW0Al259E1kDMpipdYkAiAJPfZqb+WurZuf1apU5xeE6Igui9dvt5tihQLDvxlY1AEhAqbnruyo677ktQjio7XOchO3w51Dh9AbRVngha5jtNfT");
    case(
      "bc1pcquvhrqv0q68t4m0hfq6tpn006qrskyc7yrqnp2uyrf2emg3wynsdjyk38",
      "PURVOQ544B6HUATVBJZN5EZJUU",
      "AUB6B2Rbupzua8LTQIF06516wzl+cwKy1be8RgoiW0riyXdKwe6GTz/5Hnb37m67pJwIKCh+D5jDueG6KpvYpmu8",
    );
    case("bc1qw6g0rgrpuxvj4edkwtvzpmt3c5m08mhp8nuk3mrk4erufvlczp5ssdscjd", "G7ZTXXOVJFHGDD6XYJAGBAMT5A", "BABIMEUCIQCKl1f9Cj26k0fFWE48+O4ibhYJYPytbDZWJRaaG9BybwIgCbk+3BViWkpuu2RI+41dwtlQ/m/01G860pTFCzDFfokBSDBFAiEA0O77DJsaM7IO+Ht06sp3umzXB64CNNOwf2isZuPfdmwCIGlggOwRSkXsqlPhE1gMdd5hf7ycL33Orfrr4v/XnMGSAUdSIQNsu/OwZurHvJMoiJoSAmmCHLoqIc5Wblh+rek+7rhASCECgYVkUspeAxwRfM6v4GRBhN/gGxTfpPqZuOlBIYZxTJZSrg==");
    case("bc1qazhmhwl9sxgjmwnd96hh926s3x5l0cf64yy6hvyn6qms438x550qy5sgva", "Z3SB7SRL555ZGOHVMYT5WG7RIZ", "BQBHMEQCICNI6H6b+VCZV9Z2H6EW5hPrE1buC6SJuy2ljSNmQlGfAiASbm5UrA8KH6TwF6evx7COV+i27ubiq2v9TyLYPOO63gFIMEUCIQCMOFnJbg0sy88G6wUXjv5stjVgfvAokOogWsisdkAnlAIgETfBw7kJhISFu9vIomFcEF/1NsN6c0h3KjNcpmNAZtMBSDBFAiEA/lUU+wBeA3prt8vHRpcQN763OYZ8L61DfN0QI/gkHpMCIB2qHwgoXNTH0sdqeAMD2ah7dSTie2bflax3Q3I/GibQAWlTIQKo003Zjj9Jg/kT7sOA7cTdIKmzsrIYBAuPd9hj8FZuHCEC6BdalMtwbjcx2vJjVelv7BJml0rY7Q5ze+PWen6tb5shAytperlYBs69tbn86t3pINqXy0NzttKZKi6Y8X+USQXaU64=");
  }

  #[test]
  fn official_vectors_full() {
    #[track_caller]
    fn case(address: &str, message: &str, signature: &str) {
      assert!(verify::verify_full_encoded(address, message, signature).is_ok());
    }

    case("bc1qrqtlzcq86850yzgsyq9sssawx2qxlx5yq3xpkd", "KLE5MMJBTNF4AVZXIO3GIL5UWF", "AgAAAAABAUrfzHHOLAKmgCIFSTT3krp+cQxj1BDPBN4GBg3tRmFXAAAAAADgBwAAAQAAAAAAAAAAAWoCSDBFAiEAjYj85zyhQKa9DbMO0reDwdhkNwKJkF3q2qFcijXDgMUCIAaQ75s3fwqrCeYIUJugLvhxZFxQIVquGN90vIKCW3QLASEDMurnDzvc0zABUwVwCADfGXoDx/M3SQnYt7e3IHDoU3PgBwAA");
    case("bc1pve87s3l2levjmhetzr2f9xvep3y266xty0hnefmyv8tkxc3e4qssll2kdu", "XQMVC3YR6AOGZIHLSUQ2NSSBI2", "AgAAAAABAROFPNY6Zt8hFK0YQq5Wb6wk/CnUYEPtQ0HTHDyzNROrAAAAAADgBwAAAQAAAAAAAAAAAWoBQNRdLOo5XZY0SBqAsLZNr/z3Bqrmo3OxVn7e4tD/OOD4H9U/L1unq5Nmdz+S1w7SHtt46bFwnd8xnRVan8BofFfgBwAA");
    case("32Utb7Seg6EXq7UesMNJXhQ1gdohYNyzQ9", "EMYGZHEY3LIANYKCR7XJF3NMFQ", "AgAAAAABAe5xLNMlYQH4OGjJ3h4lqQaVp0Cic7mwxkvyWswqFMXeAAAAABcWABSy/hpDH/KLAi4x25Tmb2UaO1xtWeAHAAABAAAAAAAAAAABagJHMEQCIDEleqb0n1R5c21TGkWRXNFae98wbwI0QOyh/YmRuQX1AiAcv1MhyTzPOVgZ1VIwuu0tDxrVJUHK8lhOUOXpsZnGwwEhAsjeDEoWX8hvEC8A/692yGQsPh6JBO8Zf4aITEQsKAcJ4AcAAA==");
    case("bc1qg8r3cl47rrr75dwvr7jhzdukptegnmq8v0nmjd2jdn4qvlczqkts0rqtav", "QXYOWYWO7ZGJC4OPNC367HBUQF", "AgAAAAABAXshuDM6YKy1LClwk1ZOM5egX7RTFPOCvtxJkYFYk/FEAAAAAADgBwAAAQAAAAAAAAAAAWoEAEgwRQIhAI9uOxvqmBV0pldOoKWnSYhjobNhP4F+gxO0QlOdGtxFAiBROcNruLigZE4lj1DJEh8yGrqS00MeW463EO78TsaRFgFIMEUCIQCAhIqYuU4wDA2AYsU+QDVyucH4Tm/NSDP2+txyPMKEkAIgfuGlSh7ncxb2yV3S3aOF5uwHGqtIZjp3b4HW0d35EckBR1IhAkT3y4QqTOTzUs5AYq5eCl1g1vqgsHtiwgY0hKpSl7vOIQI07tYZDvxHcWuVOgULVj+LK1I63eqVWuQzUd0qkqpJ9FKu4AcAAA==");
    case("bc1q8vy6jhfe8ca0uruvr4aqkjk75dpg5m30rnwatg60uhya00dhlyqs2xvt2a", "3VJANNKSXPLND6YRKG6CUEUZXX", "AgAAAAABAU2vSmP5XYqecVKygaRRribDp5piMoVxUkxUnFSff8kRAAAAAADgBwAAAQAAAAAAAAAAAWoFAEgwRQIhAKBSw74gHlx272y4RzyU/ap7iNO5rmB6XXgBOy3Qsc/EAiBUnSrF/XhvuvAwi/mMme0JDpuCvl+oZ9C4f3H8OemXCAFIMEUCIQDK3wH0l2AvJ5FZ923ZMJkY1z0MBh1Nee9wjK7tVxFz5gIgdC1XBD/IdBPtx1xmyvSFhbIJlvnz98fPTm50K6KaXpEBSDBFAiEAyP3nXTzXrTmzq54x8jAY02ERHycEYzYqT9cpRTeEWg4CIHxRk3e3oPrM9oCZ8xcgNQ3lRhyc+G0qdDIl6qa8SN4AAWlTIQIlBvEshNuT7T6Ja01YgHs0G31etR15oRdjg2JJs6Hf5CEDBbFTr8NwzY8uUi5qQ1z16XJjdr9VZ1LBpDcElWryIwUhAkLyDL4FQMvj0TI89hZZ8ja4nCrlk9235CCAWXmU0hbgU67gBwAA");
    case("3PGZjFkYBL1m9WBWkWbCW5FEFTaS1Hj4EB", "NQVRV3DJYLKBANM3OPTNBULEU3", "AgAAAAABAVscdBvYDFN98A//Rt/fAWcN7mdM0x2yWzBjC33c7X5HAAAAACMiACDkkR/DseXy+GXBPtxHvHehUjHt+9XjRmZAgxuuomAC4eAHAAABAAAAAAAAAAABagQASDBFAiEA47YK5XeIGBMQC9bCfWb+IIfirIWlqAzQVc6E/lgBPZICIA0k/EO2t3YhqmYR5WdXUBGgAzR+IqgZ5/mxvj+4UoDTAUgwRQIhAPCIVZCSoIaOjY9BzYIXWEvbhpOl4JR88p/xYVoZObd6AiADyJXNqpDg/Lc2viPX14N2d0jQdEjamY4SmiU7GNbIOgFHUiED+4JBU/wACiE8VFbQF4DR8pKgz7+8X2+PHccTcGxVGdEhA9uIzp+4CB5QRgvrN1OXQbBmfW8kOd0cooPWMYJCHBCxUq7gBwAA");
    case("3Nye4j1GUFqCEBR3do2KEFZAs9oLe8NZ6X", "7OKFLKRXSP6J42VQOMSG7MVXEP", "AgAAAAEvAyd4zsoz8gcVU5H19GLYokTAN5PxuKCBlEPjODJ86gAAAADaAEcwRAIgT6rcfxgCmG6b3DpzNV6UG0jiCQGclG9sfiSpV45HDXMCIGgtqjFBuJ7rbi+cgnG0TZiKZaxMk0KI+gQd0pHJfEYCAUgwRQIhANCvCLjGMuZMzH+nCEkNhWhR45T6QRYMLin8utpuF9r1AiBTjG2NLjkre7ec+HPg8UUhK1jL1vgq7YKjq5ROv+h07AFHUiEDhKjcb/Pv1/7AYutzOXwgec08wwD/VwiPm58Lc0xjohghAhycjpwdBuP33orQXAH1CAsrgSkuspxM2+FPQ4OCVhQWUq7gBwAAAQAAAAAAAAAAAWrgBwAA");
  }

  #[test]
  fn official_vectors_rejected() {
    #[track_caller]
    fn case(address: &str, message: &str, signature: &str, full: bool) {
      let result = if full {
        verify::verify_full_encoded(address, message, signature)
      } else {
        verify::verify_simple_encoded(address, message, signature)
      };

      assert!(result.is_err());
    }

    // time-locked script types are not supported
    case("bc1p6vffkx7vcyezrjq7pg9qqdjv7vmtanfhk8ukwsn4syejwmarmhxqp0rw5x", "AY2VOQOXYI5CN2EHZKLOX7ZI37", "AgAAAAABAaza7/ukfX9ZdxCUvK7CPJgADDdPdF7ikXVKWctd5EHrAAAAAADgBwAAAQAAAAAAAAAAAWoEQPvuT0enYGwsab2lsPZU0U3OcRkGng+o/PAt4QU2lc8hG7lTUmflkt0To+eoipv2vptf0TlGOBCsKU5xE3kXKcMAS2MgrYfXhOkh0CvwuJpB+O3tal2ECfO0v7k1/A4PTlGcQiBnAuAHsnUgJjLn4tl5ytgC8CNTyITXmg4rx9ctxPedwRMPEBvfoUBorCHBJjLn4tl5ytgC8CNTyITXmg4rx9ctxPedwRMPEBvfoUDgBwAA", true);
    case("bc1qhqcmw7ud03vqde3pe6hzajaylhucmlatrkcztzpnk8vpgvhg9dzq5ydark", "MGKMA2MJUBDHT55J7MHOLM7UPE", "AgAAAAABAYYJeOOOi3c33O+dholAwiF51Amy/E0qIf3ew2vFtDtTAAAAAADgBwAAAQAAAAAAAAAAAWoDSDBFAiEA64MwD2HkJjPLPAc2u5ia6ZdwCVO3okzVqGPEXnuJGZQCIE27BGOBQTdwJ2M/Wdsm6nFVunqaj+xZBSG/g/64FMbtAQBNYyEDrYfXhOkh0CvwuJpB+O3tal2ECfO0v7k1/A4PTlGcQiBnAuAHsnUhA4ZGGvodKgqeg/ZYffm6miaKaG57VkCSjmmRprCa+ulyaKzgBwAA", true);

    // wrong message for p2wsh-multisig-2of2 simple signature
    case("bc1qw6g0rgrpuxvj4edkwtvzpmt3c5m08mhp8nuk3mrk4erufvlczp5ssdscjd", "DL2KXDPQAN63YIQPIP34O3XYVX", "BABIMEUCIQCKl1f9Cj26k0fFWE48+O4ibhYJYPytbDZWJRaaG9BybwIgCbk+3BViWkpuu2RI+41dwtlQ/m/01G860pTFCzDFfokBSDBFAiEA0O77DJsaM7IO+Ht06sp3umzXB64CNNOwf2isZuPfdmwCIGlggOwRSkXsqlPhE1gMdd5hf7ycL33Orfrr4v/XnMGSAUdSIQNsu/OwZurHvJMoiJoSAmmCHLoqIc5Wblh+rek+7rhASCECgYVkUspeAxwRfM6v4GRBhN/gGxTfpPqZuOlBIYZxTJZSrg==", false);
    // wrong signer for p2wsh-multisig-2of2 simple signature
    case("bc1q47vnwr6fsarstmmw89wrkvl89540sn5g79x75ms8aly9rrsnq8eqh3v9gz", "G7ZTXXOVJFHGDD6XYJAGBAMT5A", "BABIMEUCIQCKl1f9Cj26k0fFWE48+O4ibhYJYPytbDZWJRaaG9BybwIgCbk+3BViWkpuu2RI+41dwtlQ/m/01G860pTFCzDFfokBSDBFAiEA0O77DJsaM7IO+Ht06sp3umzXB64CNNOwf2isZuPfdmwCIGlggOwRSkXsqlPhE1gMdd5hf7ycL33Orfrr4v/XnMGSAUdSIQNsu/OwZurHvJMoiJoSAmmCHLoqIc5Wblh+rek+7rhASCECgYVkUspeAxwRfM6v4GRBhN/gGxTfpPqZuOlBIYZxTJZSrg==", false);
    // wrong message for p2wsh-multisig-3of3 simple signature
    case("bc1qazhmhwl9sxgjmwnd96hh926s3x5l0cf64yy6hvyn6qms438x550qy5sgva", "UKLIJM5HKKQEIFJ44R7UIQFMYL", "BQBHMEQCICNI6H6b+VCZV9Z2H6EW5hPrE1buC6SJuy2ljSNmQlGfAiASbm5UrA8KH6TwF6evx7COV+i27ubiq2v9TyLYPOO63gFIMEUCIQCMOFnJbg0sy88G6wUXjv5stjVgfvAokOogWsisdkAnlAIgETfBw7kJhISFu9vIomFcEF/1NsN6c0h3KjNcpmNAZtMBSDBFAiEA/lUU+wBeA3prt8vHRpcQN763OYZ8L61DfN0QI/gkHpMCIB2qHwgoXNTH0sdqeAMD2ah7dSTie2bflax3Q3I/GibQAWlTIQKo003Zjj9Jg/kT7sOA7cTdIKmzsrIYBAuPd9hj8FZuHCEC6BdalMtwbjcx2vJjVelv7BJml0rY7Q5ze+PWen6tb5shAytperlYBs69tbn86t3pINqXy0NzttKZKi6Y8X+USQXaU64=", false);
    // wrong signer for p2wsh-multisig-3of3 simple signature
    case("bc1qnckc2q6804depn2240l66p93e0mscp7vd9ndptfuznex86ehpcvseq6e8a", "Z3SB7SRL555ZGOHVMYT5WG7RIZ", "BQBHMEQCICNI6H6b+VCZV9Z2H6EW5hPrE1buC6SJuy2ljSNmQlGfAiASbm5UrA8KH6TwF6evx7COV+i27ubiq2v9TyLYPOO63gFIMEUCIQCMOFnJbg0sy88G6wUXjv5stjVgfvAokOogWsisdkAnlAIgETfBw7kJhISFu9vIomFcEF/1NsN6c0h3KjNcpmNAZtMBSDBFAiEA/lUU+wBeA3prt8vHRpcQN763OYZ8L61DfN0QI/gkHpMCIB2qHwgoXNTH0sdqeAMD2ah7dSTie2bflax3Q3I/GibQAWlTIQKo003Zjj9Jg/kT7sOA7cTdIKmzsrIYBAuPd9hj8FZuHCEC6BdalMtwbjcx2vJjVelv7BJml0rY7Q5ze+PWen6tb5shAytperlYBs69tbn86t3pINqXy0NzttKZKi6Y8X+USQXaU64=", false);
    // wrong message for p2wsh-multisig-2of2 full signature
    case("bc1qg8r3cl47rrr75dwvr7jhzdukptegnmq8v0nmjd2jdn4qvlczqkts0rqtav", "OANRY57VZNHOXZNYGCGZM5ADYG", "AgAAAAABAXshuDM6YKy1LClwk1ZOM5egX7RTFPOCvtxJkYFYk/FEAAAAAADgBwAAAQAAAAAAAAAAAWoEAEgwRQIhAI9uOxvqmBV0pldOoKWnSYhjobNhP4F+gxO0QlOdGtxFAiBROcNruLigZE4lj1DJEh8yGrqS00MeW463EO78TsaRFgFIMEUCIQCAhIqYuU4wDA2AYsU+QDVyucH4Tm/NSDP2+txyPMKEkAIgfuGlSh7ncxb2yV3S3aOF5uwHGqtIZjp3b4HW0d35EckBR1IhAkT3y4QqTOTzUs5AYq5eCl1g1vqgsHtiwgY0hKpSl7vOIQI07tYZDvxHcWuVOgULVj+LK1I63eqVWuQzUd0qkqpJ9FKu4AcAAA==", true);
    // wrong signer for p2wsh-multisig-2of2 full signature
    case("bc1qan5sys8u4cpvgutt70fn2tgweu7as9aw0slljuz86x4nyr8myvjsgz3q2v", "QXYOWYWO7ZGJC4OPNC367HBUQF", "AgAAAAABAXshuDM6YKy1LClwk1ZOM5egX7RTFPOCvtxJkYFYk/FEAAAAAADgBwAAAQAAAAAAAAAAAWoEAEgwRQIhAI9uOxvqmBV0pldOoKWnSYhjobNhP4F+gxO0QlOdGtxFAiBROcNruLigZE4lj1DJEh8yGrqS00MeW463EO78TsaRFgFIMEUCIQCAhIqYuU4wDA2AYsU+QDVyucH4Tm/NSDP2+txyPMKEkAIgfuGlSh7ncxb2yV3S3aOF5uwHGqtIZjp3b4HW0d35EckBR1IhAkT3y4QqTOTzUs5AYq5eCl1g1vqgsHtiwgY0hKpSl7vOIQI07tYZDvxHcWuVOgULVj+LK1I63eqVWuQzUd0qkqpJ9FKu4AcAAA==", true);
    // wrong message for p2wsh-multisig-3of3 full signature
    case("bc1q8vy6jhfe8ca0uruvr4aqkjk75dpg5m30rnwatg60uhya00dhlyqs2xvt2a", "UZQGB4YTYIS3PRT3UUOCO3YCX3", "AgAAAAABAU2vSmP5XYqecVKygaRRribDp5piMoVxUkxUnFSff8kRAAAAAADgBwAAAQAAAAAAAAAAAWoFAEgwRQIhAKBSw74gHlx272y4RzyU/ap7iNO5rmB6XXgBOy3Qsc/EAiBUnSrF/XhvuvAwi/mMme0JDpuCvl+oZ9C4f3H8OemXCAFIMEUCIQDK3wH0l2AvJ5FZ923ZMJkY1z0MBh1Nee9wjK7tVxFz5gIgdC1XBD/IdBPtx1xmyvSFhbIJlvnz98fPTm50K6KaXpEBSDBFAiEAyP3nXTzXrTmzq54x8jAY02ERHycEYzYqT9cpRTeEWg4CIHxRk3e3oPrM9oCZ8xcgNQ3lRhyc+G0qdDIl6qa8SN4AAWlTIQIlBvEshNuT7T6Ja01YgHs0G31etR15oRdjg2JJs6Hf5CEDBbFTr8NwzY8uUi5qQ1z16XJjdr9VZ1LBpDcElWryIwUhAkLyDL4FQMvj0TI89hZZ8ja4nCrlk9235CCAWXmU0hbgU67gBwAA", true);
    // wrong signer for p2wsh-multisig-3of3 full signature
    case("bc1qma94rw0f5t4l64wc6xfrjuuatqn6klcwmxvls86y9k4rjvva40wqr8u0cq", "3VJANNKSXPLND6YRKG6CUEUZXX", "AgAAAAABAU2vSmP5XYqecVKygaRRribDp5piMoVxUkxUnFSff8kRAAAAAADgBwAAAQAAAAAAAAAAAWoFAEgwRQIhAKBSw74gHlx272y4RzyU/ap7iNO5rmB6XXgBOy3Qsc/EAiBUnSrF/XhvuvAwi/mMme0JDpuCvl+oZ9C4f3H8OemXCAFIMEUCIQDK3wH0l2AvJ5FZ923ZMJkY1z0MBh1Nee9wjK7tVxFz5gIgdC1XBD/IdBPtx1xmyvSFhbIJlvnz98fPTm50K6KaXpEBSDBFAiEAyP3nXTzXrTmzq54x8jAY02ERHycEYzYqT9cpRTeEWg4CIHxRk3e3oPrM9oCZ8xcgNQ3lRhyc+G0qdDIl6qa8SN4AAWlTIQIlBvEshNuT7T6Ja01YgHs0G31etR15oRdjg2JJs6Hf5CEDBbFTr8NwzY8uUi5qQ1z16XJjdr9VZ1LBpDcElWryIwUhAkLyDL4FQMvj0TI89hZZ8ja4nCrlk9235CCAWXmU0hbgU67gBwAA", true);
    // wrong message for p2sh-p2wsh-multisig-2of2 full signature
    case("3PGZjFkYBL1m9WBWkWbCW5FEFTaS1Hj4EB", "FOQHOIFXJVPFSGGBRLAX53D6R2", "AgAAAAABAVscdBvYDFN98A//Rt/fAWcN7mdM0x2yWzBjC33c7X5HAAAAACMiACDkkR/DseXy+GXBPtxHvHehUjHt+9XjRmZAgxuuomAC4eAHAAABAAAAAAAAAAABagQASDBFAiEA47YK5XeIGBMQC9bCfWb+IIfirIWlqAzQVc6E/lgBPZICIA0k/EO2t3YhqmYR5WdXUBGgAzR+IqgZ5/mxvj+4UoDTAUgwRQIhAPCIVZCSoIaOjY9BzYIXWEvbhpOl4JR88p/xYVoZObd6AiADyJXNqpDg/Lc2viPX14N2d0jQdEjamY4SmiU7GNbIOgFHUiED+4JBU/wACiE8VFbQF4DR8pKgz7+8X2+PHccTcGxVGdEhA9uIzp+4CB5QRgvrN1OXQbBmfW8kOd0cooPWMYJCHBCxUq7gBwAA", true);
    // wrong signer for p2sh-p2wsh-multisig-2of2 full signature
    case("3DA7VZKYcuiaJFsDnzWjBDvh4VhBFZk6jg", "NQVRV3DJYLKBANM3OPTNBULEU3", "AgAAAAABAVscdBvYDFN98A//Rt/fAWcN7mdM0x2yWzBjC33c7X5HAAAAACMiACDkkR/DseXy+GXBPtxHvHehUjHt+9XjRmZAgxuuomAC4eAHAAABAAAAAAAAAAABagQASDBFAiEA47YK5XeIGBMQC9bCfWb+IIfirIWlqAzQVc6E/lgBPZICIA0k/EO2t3YhqmYR5WdXUBGgAzR+IqgZ5/mxvj+4UoDTAUgwRQIhAPCIVZCSoIaOjY9BzYIXWEvbhpOl4JR88p/xYVoZObd6AiADyJXNqpDg/Lc2viPX14N2d0jQdEjamY4SmiU7GNbIOgFHUiED+4JBU/wACiE8VFbQF4DR8pKgz7+8X2+PHccTcGxVGdEhA9uIzp+4CB5QRgvrN1OXQbBmfW8kOd0cooPWMYJCHBCxUq7gBwAA", true);
    // wrong message for p2sh-multisig-2of2 full signature
    case("3Nye4j1GUFqCEBR3do2KEFZAs9oLe8NZ6X", "DAOHN7TAL75XRHJILGIO3RXAEM", "AgAAAAEvAyd4zsoz8gcVU5H19GLYokTAN5PxuKCBlEPjODJ86gAAAADaAEcwRAIgT6rcfxgCmG6b3DpzNV6UG0jiCQGclG9sfiSpV45HDXMCIGgtqjFBuJ7rbi+cgnG0TZiKZaxMk0KI+gQd0pHJfEYCAUgwRQIhANCvCLjGMuZMzH+nCEkNhWhR45T6QRYMLin8utpuF9r1AiBTjG2NLjkre7ec+HPg8UUhK1jL1vgq7YKjq5ROv+h07AFHUiEDhKjcb/Pv1/7AYutzOXwgec08wwD/VwiPm58Lc0xjohghAhycjpwdBuP33orQXAH1CAsrgSkuspxM2+FPQ4OCVhQWUq7gBwAAAQAAAAAAAAAAAWrgBwAA", true);
    // wrong signer for p2sh-multisig-2of2 full signature
    case("3L9uCVRBUfLgKQQK366dmutgsp3GpCwYGE", "7OKFLKRXSP6J42VQOMSG7MVXEP", "AgAAAAEvAyd4zsoz8gcVU5H19GLYokTAN5PxuKCBlEPjODJ86gAAAADaAEcwRAIgT6rcfxgCmG6b3DpzNV6UG0jiCQGclG9sfiSpV45HDXMCIGgtqjFBuJ7rbi+cgnG0TZiKZaxMk0KI+gQd0pHJfEYCAUgwRQIhANCvCLjGMuZMzH+nCEkNhWhR45T6QRYMLin8utpuF9r1AiBTjG2NLjkre7ec+HPg8UUhK1jL1vgq7YKjq5ROv+h07AFHUiEDhKjcb/Pv1/7AYutzOXwgec08wwD/VwiPm58Lc0xjohghAhycjpwdBuP33orQXAH1CAsrgSkuspxM2+FPQ4OCVhQWUq7gBwAAAQAAAAAAAAAAAWrgBwAA", true);
  }

  fn p2wsh_2of2_witness(address: &Address) -> Witness {
    sign::sign_simple(
      address,
      P2WSH_2OF2_MESSAGE,
      &[
        PrivateKey::from_wif(P2WSH_2OF2_PRIVATE_KEY_1).unwrap(),
        PrivateKey::from_wif(P2WSH_2OF2_PRIVATE_KEY_2).unwrap(),
      ],
      Some(&ScriptBuf::from_hex(P2WSH_2OF2_WITNESS_SCRIPT).unwrap()),
    )
    .unwrap()
  }

  #[test]
  fn verify_multisig_rejects_wrong_signature_count() {
    let address = Address::from_str(P2WSH_2OF2_ADDRESS)
      .unwrap()
      .assume_checked();

    let items = p2wsh_2of2_witness(&address).to_vec();

    let mut witness = Witness::new();
    witness.push::<&[u8]>(&[]);
    witness.push(&items[1]);
    witness.push(&items[3]);

    assert!(matches!(
      verify::verify_simple(&address, P2WSH_2OF2_MESSAGE, witness),
      Err(Error::InvalidWitness)
    ));
  }

  #[test]
  fn verify_multisig_rejects_out_of_order_signatures() {
    let address = Address::from_str(P2WSH_2OF2_ADDRESS)
      .unwrap()
      .assume_checked();

    let items = p2wsh_2of2_witness(&address).to_vec();

    let mut witness = Witness::new();
    witness.push::<&[u8]>(&[]);
    witness.push(&items[2]);
    witness.push(&items[1]);
    witness.push(&items[3]);

    assert!(matches!(
      verify::verify_simple(&address, P2WSH_2OF2_MESSAGE, witness),
      Err(Error::SignatureInvalid { .. })
    ));
  }

  #[test]
  fn verify_multisig_rejects_tampered_witness_script() {
    let address = Address::from_str(P2WSH_2OF2_ADDRESS)
      .unwrap()
      .assume_checked();

    let items = p2wsh_2of2_witness(&address).to_vec();

    let mut script = items[3].clone();
    script[5] ^= 1;

    let mut witness = Witness::new();
    witness.push::<&[u8]>(&[]);
    witness.push(&items[1]);
    witness.push(&items[2]);
    witness.push(script);

    assert!(matches!(
      verify::verify_simple(&address, P2WSH_2OF2_MESSAGE, witness),
      Err(Error::ToSignInvalid)
    ));
  }

  #[test]
  fn verify_simple_rejects_legacy_p2sh_multisig() {
    assert!(matches!(
      verify::verify_simple(
        &Address::from_str(P2SH_MULTISIG_2OF2_ADDRESS)
          .unwrap()
          .assume_checked(),
        "foo",
        Witness::new()
      ),
      Err(Error::InvalidWitness)
    ));
  }

  #[test]
  fn verify_p2wpkh_rejects_mismatched_key() {
    let victim = Address::from_str("bc1qqthe0hz8klx90e7stf6shclhsvqd5ly96pn53v")
      .unwrap()
      .assume_checked();

    let witness = sign::sign_simple(
      &victim,
      "foo",
      &[PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap()],
      None,
    )
    .unwrap();

    assert!(matches!(
      verify::verify_simple(&victim, "foo", witness),
      Err(Error::PublicKeyMismatch)
    ));
  }

  #[test]
  fn verify_p2sh_p2wpkh_rejects_mismatched_key() {
    let victim = Address::from_str(P2SH_P2WSH_2OF2_ADDRESS)
      .unwrap()
      .assume_checked();

    let to_spend = create_to_spend(&victim, "foo").unwrap();
    let to_sign = create_to_sign(&to_spend, None).unwrap();

    let witness = create_message_signature_p2wpkh(
      &to_sign,
      &PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap(),
      &to_spend.output[0],
      0,
      true,
    )
    .unwrap();

    assert!(matches!(
      verify::verify_simple(&victim, "foo", witness),
      Err(Error::PublicKeyMismatch)
    ));
  }

  #[test]
  fn verify_p2sh_p2wpkh_rejects_uncompressed_witness_key() {
    let pub_key = PrivateKey::from_wif(UNCOMPRESSED_WIF_PRIVATE_KEY)
      .unwrap()
      .public_key(&Secp256k1::new());

    let mut witness = Witness::new();
    witness.push(vec![0; 71]);
    witness.push(pub_key.to_bytes());

    assert!(matches!(
      verify::verify_simple(
        &Address::from_str(NESTED_SEGWIT_ADDRESS)
          .unwrap()
          .assume_checked(),
        "foo",
        witness
      ),
      Err(Error::UncompressedPublicKey { .. })
    ));
  }

  #[test]
  fn sign_simple_rejects_p2sh_p2wsh() {
    assert!(matches!(
      sign::sign_simple_encoded(
        P2SH_P2WSH_2OF2_ADDRESS,
        "foo",
        &[P2SH_P2WSH_2OF2_PRIVATE_KEY_1, P2SH_P2WSH_2OF2_PRIVATE_KEY_2],
        Some(P2SH_P2WSH_2OF2_WITNESS_SCRIPT),
      ),
      Err(Error::UnsupportedAddress { .. })
    ));
  }

  #[test]
  fn roundtrip_p2sh_multisig_full() {
    assert!(verify::verify_full_encoded(
      P2SH_MULTISIG_2OF2_ADDRESS,
      "foo",
      &sign::sign_full_encoded(
        P2SH_MULTISIG_2OF2_ADDRESS,
        "foo",
        &[
          P2SH_MULTISIG_2OF2_PRIVATE_KEY_1,
          P2SH_MULTISIG_2OF2_PRIVATE_KEY_2
        ],
        Some(P2SH_MULTISIG_2OF2_REDEEM_SCRIPT),
      )
      .unwrap()
    )
    .is_ok());
  }

  #[test]
  fn multisig_rejects_duplicate_signer() {
    assert!(matches!(
      sign::sign_simple_encoded(
        P2WSH_2OF2_ADDRESS,
        "foo",
        &[P2WSH_2OF2_PRIVATE_KEY_1, P2WSH_2OF2_PRIVATE_KEY_1],
        Some(P2WSH_2OF2_WITNESS_SCRIPT),
      ),
      Err(Error::DuplicateSigner)
    ));
  }

  #[test]
  fn sign_rejects_no_private_keys() {
    let keys: &[&str] = &[];

    assert!(matches!(
      sign::sign_simple_encoded(SEGWIT_ADDRESS, "foo", keys, None),
      Err(Error::NoPrivateKeys)
    ));
  }

  #[test]
  fn verify_rejects_non_sighash_all_signatures() {
    let key = PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap();

    let p2wpkh = Address::from_str(SEGWIT_ADDRESS).unwrap().assume_checked();
    let mut items = sign::sign_simple(&p2wpkh, "foo", &[key], None)
      .unwrap()
      .to_vec();
    *items[0].last_mut().unwrap() = 0x02;
    assert!(matches!(
      verify::verify_simple(&p2wpkh, "foo", Witness::from_slice(&items)),
      Err(Error::SigHashTypeUnsupported { .. })
    ));

    let p2tr = Address::from_str(TAPROOT_ADDRESS).unwrap().assume_checked();
    let mut items = sign::sign_simple(&p2tr, "foo", &[key], None)
      .unwrap()
      .to_vec();
    *items[0].last_mut().unwrap() = 0x02;
    assert!(matches!(
      verify::verify_simple(&p2tr, "foo", Witness::from_slice(&items)),
      Err(Error::SigHashTypeUnsupported { .. })
    ));

    let p2wsh = Address::from_str(P2WSH_2OF2_ADDRESS)
      .unwrap()
      .assume_checked();
    let mut items = p2wsh_2of2_witness(&p2wsh).to_vec();
    *items[1].last_mut().unwrap() = 0x02;
    assert!(matches!(
      verify::verify_simple(&p2wsh, P2WSH_2OF2_MESSAGE, Witness::from_slice(&items)),
      Err(Error::SigHashTypeUnsupported { .. })
    ));
  }

  #[test]
  fn verify_full_p2tr_rejects_script_sig() {
    let address = Address::from_str(TAPROOT_ADDRESS).unwrap().assume_checked();

    let mut to_sign = sign::sign_full(
      &address,
      "foo",
      &[PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap()],
      None,
    )
    .unwrap();

    to_sign.input[0].script_sig = ScriptBuf::from_hex("deadbeef").unwrap();

    assert!(matches!(
      verify::verify_full(&address, "foo", to_sign),
      Err(Error::ToSignInvalid)
    ));
  }

  #[test]
  fn verify_p2sh_p2wsh_rejects_tampered_script_sig() {
    let address = Address::from_str(P2SH_P2WSH_2OF2_ADDRESS)
      .unwrap()
      .assume_checked();

    let mut to_sign = sign::sign_full(
      &address,
      P2SH_P2WSH_2OF2_MESSAGE,
      &[
        PrivateKey::from_wif(P2SH_P2WSH_2OF2_PRIVATE_KEY_1).unwrap(),
        PrivateKey::from_wif(P2SH_P2WSH_2OF2_PRIVATE_KEY_2).unwrap(),
      ],
      Some(&ScriptBuf::from_hex(P2SH_P2WSH_2OF2_WITNESS_SCRIPT).unwrap()),
    )
    .unwrap();

    to_sign.input[0].script_sig = ScriptBuf::from_hex("deadbeef").unwrap();

    assert!(matches!(
      verify::verify_full(&address, P2SH_P2WSH_2OF2_MESSAGE, to_sign),
      Err(Error::ToSignInvalid)
    ));
  }

  #[test]
  fn multisig_rejects_wrong_key_count() {
    assert!(matches!(
      sign::sign_simple_encoded(
        P2WSH_2OF2_ADDRESS,
        "foo",
        &[P2WSH_2OF2_PRIVATE_KEY_1],
        Some(P2WSH_2OF2_WITNESS_SCRIPT),
      ),
      Err(Error::SignatureCount {
        required: 2,
        provided: 1
      })
    ));
  }

  #[test]
  fn sign_p2sh_rejects_mismatched_witness_script() {
    assert!(matches!(
      sign::sign_full_encoded(
        P2SH_P2WSH_2OF2_ADDRESS,
        "foo",
        &[P2SH_P2WSH_2OF2_PRIVATE_KEY_1, P2SH_P2WSH_2OF2_PRIVATE_KEY_2],
        Some(P2WSH_2OF2_WITNESS_SCRIPT),
      ),
      Err(Error::UnsupportedAddress { .. })
    ));
  }

  #[test]
  fn sign_p2wsh_rejects_missing_witness_script() {
    assert!(matches!(
      sign::sign_simple_encoded(
        P2WSH_2OF2_ADDRESS,
        "foo",
        &[P2WSH_2OF2_PRIVATE_KEY_1, P2WSH_2OF2_PRIVATE_KEY_2],
        None,
      ),
      Err(Error::InvalidWitness)
    ))
  }

  #[test]
  fn roundtrip_legacy() {
    assert!(verify::verify_legacy_encoded(
      LEGACY_ADDRESS,
      "Hello World",
      &sign::sign_legacy_encoded(LEGACY_ADDRESS, "Hello World", WIF_PRIVATE_KEY).unwrap()
    )
    .is_ok(),);
  }

  #[test]
  fn roundtrip_legacy_typed() {
    let address = Address::from_str(LEGACY_ADDRESS).unwrap().assume_checked();
    let private_key = PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap();

    let signature = sign::sign_legacy(&address, "foo", &private_key).unwrap();

    assert!(verify::verify_legacy(&address, "foo", signature).is_ok());
  }

  #[test]
  fn legacy_address_rejects_simple_proof() {
    assert!(matches!(
      verify::verify_simple_encoded(
        LEGACY_ADDRESS,
        "",
        "AkcwRAIgM2gBAQqvZX15ZiysmKmQpDrG83avLIT492QBzLnQIxYCIBaTpOaD20qRlEylyxFSeEA2ba9YOixpX8z46TSDtS40ASECx/EgAxlkQpQ9hYjgGu6EBCPMVPwVIVJqO4XCsMvViHI="
      )
      .unwrap_err(),
      Error::InvalidWitness
    ));
  }

  #[test]
  fn roundtrip_pof_p2tr_with_inputs() {
    let proof_inputs = vec![
      ProofInput {
        outpoint: OutPoint {
          txid: "1111111111111111111111111111111111111111111111111111111111111111"
            .parse()
            .unwrap(),
          vout: 0,
        },
        prevout: TxOut {
          value: Amount::from_sat(345678),
          script_pubkey: ScriptBuf::from_hex(
            "5120788b90c2b523c73a4237d04df46b232858be3bbc0e65d8d049a7fa59d5719db8",
          )
          .unwrap(),
        },
        prev_tx: None,
        private_keys: vec![PrivateKey::from_wif(POF_P2TR_PROVEN_KEY_1).unwrap()],
        witness_script: None,
      },
      ProofInput {
        outpoint: OutPoint {
          txid: "2222222222222222222222222222222222222222222222222222222222222222"
            .parse()
            .unwrap(),
          vout: 1,
        },
        prevout: TxOut {
          value: Amount::from_sat(345678),
          script_pubkey: ScriptBuf::from_hex(
            "5120ca0dca0f4f6a2fe99f83c74ce304b031e4b94007b79ae2a94f35355563f9f5ca",
          )
          .unwrap(),
        },
        prev_tx: None,
        private_keys: vec![PrivateKey::from_wif(POF_P2TR_PROVEN_KEY_2).unwrap()],
        witness_script: None,
      },
      ProofInput {
        outpoint: OutPoint {
          txid: "3333333333333333333333333333333333333333333333333333333333333333"
            .parse()
            .unwrap(),
          vout: 1,
        },
        prevout: TxOut {
          value: Amount::from_sat(345678),
          script_pubkey: ScriptBuf::from_hex(
            "51205c2badbb20cebdce218800dda2fed598e51fab8c30e87112ec967a340b9c3099",
          )
          .unwrap(),
        },
        prev_tx: None,
        private_keys: vec![PrivateKey::from_wif(POF_P2TR_PROVEN_KEY_3).unwrap()],
        witness_script: None,
      },
    ];

    let prevouts: Vec<TxOut> = proof_inputs
      .iter()
      .map(|proof_input| proof_input.prevout.clone())
      .collect();

    let signature = sign_pof_encoded(
      POF_P2TR_ADDRESS,
      POF_P2TR_MESSAGE,
      &[POF_P2TR_CHALLENGE_KEY],
      None,
      &proof_inputs,
    )
    .unwrap();

    assert!(verify_pof_encoded(POF_P2TR_ADDRESS, POF_P2TR_MESSAGE, &signature, &prevouts).is_ok());
  }

  #[test]
  fn pof_wrong_prevout_is_rejected() {
    let proof_inputs = vec![ProofInput {
      outpoint: OutPoint {
        txid: "1111111111111111111111111111111111111111111111111111111111111111"
          .parse()
          .unwrap(),
        vout: 0,
      },
      prevout: TxOut {
        value: Amount::from_sat(345678),
        script_pubkey: ScriptBuf::from_hex(
          "5120788b90c2b523c73a4237d04df46b232858be3bbc0e65d8d049a7fa59d5719db8",
        )
        .unwrap(),
      },
      prev_tx: None,
      private_keys: vec![PrivateKey::from_wif(POF_P2TR_PROVEN_KEY_1).unwrap()],
      witness_script: None,
    }];

    // Swap in a different scriptPubKey for verification
    let wrong_prevouts = vec![TxOut {
      value: Amount::from_sat(345678),
      script_pubkey: ScriptBuf::from_hex(
        "5120ca0dca0f4f6a2fe99f83c74ce304b031e4b94007b79ae2a94f35355563f9f5ca",
      )
      .unwrap(),
    }];

    assert!(matches!(
      verify_pof_encoded(
        POF_P2TR_ADDRESS,
        POF_P2TR_MESSAGE,
        &sign_pof_encoded(
          POF_P2TR_ADDRESS,
          POF_P2TR_MESSAGE,
          &[POF_P2TR_CHALLENGE_KEY],
          None,
          &proof_inputs,
        )
        .unwrap(),
        &wrong_prevouts
      ),
      Err(Error::ToSignInvalid)
    ));
  }

  #[test]
  fn roundtrip_pof_with_legacy_input() {
    let secp = Secp256k1::new();
    let legacy_key = PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap();
    let legacy_spk = ScriptBuf::new_p2pkh(&legacy_key.public_key(&secp).pubkey_hash());

    // The real previous transaction whose output the proof claims
    let prev_tx = Transaction {
      version: Version(2),
      lock_time: LockTime::ZERO,
      input: vec![TxIn::default()],
      output: vec![TxOut {
        value: Amount::from_sat(345678),
        script_pubkey: legacy_spk.clone(),
      }],
    };

    let proof_inputs = vec![ProofInput {
      outpoint: OutPoint {
        txid: prev_tx.compute_txid(),
        vout: 0,
      },
      prevout: prev_tx.output[0].clone(),
      prev_tx: Some(prev_tx),
      private_keys: vec![legacy_key],
      witness_script: None,
    }];

    let prevouts: Vec<TxOut> = proof_inputs
      .iter()
      .map(|proof_input| proof_input.prevout.clone())
      .collect();

    assert!(verify_pof_encoded(
      POF_P2TR_ADDRESS,
      POF_P2TR_MESSAGE,
      &sign_pof_encoded(
        POF_P2TR_ADDRESS,
        POF_P2TR_MESSAGE,
        &[POF_P2TR_CHALLENGE_KEY],
        None,
        &proof_inputs,
      )
      .unwrap(),
      &prevouts
    )
    .is_ok());
  }

  #[test]
  fn sign_pof_rejects_no_proof_inputs() {
    assert!(matches!(
      sign_pof(
        &Address::from_str(POF_P2TR_ADDRESS)
          .unwrap()
          .assume_checked(),
        POF_P2TR_MESSAGE,
        &[PrivateKey::from_wif(POF_P2TR_CHALLENGE_KEY).unwrap()],
        None,
        &[],
      ),
      Err(Error::NoProofInputs)
    ));
  }

  #[test]
  fn roundtrip_pof_with_p2sh_multisig_input() {
    let spk = Address::from_str(P2SH_MULTISIG_2OF2_ADDRESS)
      .unwrap()
      .assume_checked()
      .script_pubkey();

    let prev_tx = Transaction {
      version: Version(2),
      lock_time: LockTime::ZERO,
      input: vec![TxIn::default()],
      output: vec![TxOut {
        value: Amount::from_sat(345678),
        script_pubkey: spk.clone(),
      }],
    };

    let proof_inputs = vec![ProofInput {
      outpoint: OutPoint {
        txid: prev_tx.compute_txid(),
        vout: 0,
      },
      prevout: prev_tx.output[0].clone(),
      prev_tx: Some(prev_tx),
      private_keys: vec![
        PrivateKey::from_wif(P2SH_MULTISIG_2OF2_PRIVATE_KEY_1).unwrap(),
        PrivateKey::from_wif(P2SH_MULTISIG_2OF2_PRIVATE_KEY_2).unwrap(),
      ],
      witness_script: Some(ScriptBuf::from_hex(P2SH_MULTISIG_2OF2_REDEEM_SCRIPT).unwrap()),
    }];

    let to_sign = sign_pof(
      &Address::from_str(POF_P2TR_ADDRESS)
        .unwrap()
        .assume_checked(),
      POF_P2TR_MESSAGE,
      &[PrivateKey::from_wif(POF_P2TR_CHALLENGE_KEY).unwrap()],
      None,
      &proof_inputs,
    )
    .unwrap();

    // a non-segwit input must carry the full previous transaction (BIP-174)
    assert!(to_sign.inputs[1].witness_utxo.is_none());
    assert!(to_sign.inputs[1].non_witness_utxo.is_some());

    assert!(verify_pof(
      &Address::from_str(POF_P2TR_ADDRESS)
        .unwrap()
        .assume_checked(),
      POF_P2TR_MESSAGE,
      to_sign,
      &[proof_inputs[0].prevout.clone()],
    )
    .is_ok());
  }
}
