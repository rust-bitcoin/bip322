//! Signing a message for a 2-of-2 P2WSH multisig address with the BIP-322
//! PSBT roles: a coordinator creates the request, each cosigner signs it
//! independently, and the coordinator combines and finalizes the result.

use {
  base64::{engine::general_purpose, Engine},
  bip322::{
    create_bip322_psbt, detect_bip322_psbt, finalize_bip322_psbt, sign_bip322_psbt_input,
    verify_full_encoded, LockParams,
  },
  bitcoin::{psbt::Psbt, Address, PrivateKey, ScriptBuf},
  std::str::FromStr,
};

const ADDRESS: &str = "bc1qg8r3cl47rrr75dwvr7jhzdukptegnmq8v0nmjd2jdn4qvlczqkts0rqtav";
const WITNESS_SCRIPT: &str = "52210244f7cb842a4ce4f352ce4062ae5e0a5d60d6faa0b07b62c2063484aa5297bbce210234eed6190efc47716b953a050b563f8b2b523addea955ae43351dd2a92aa49f452ae";
const COSIGNER_KEYS: [&str; 2] = [
  "L14bn1tSDZUKYLLiTConCRHbqzGef8eqB2tU5PBPFBkyPLUyob7V",
  "KyJnWYygb7P2P8khWyDMW9yFGA3dUe7kpkEHtLbzY6cfvvn9T5CS",
];
const MESSAGE: &str = "QXYOWYWO7ZGJC4OPNC367HBUQF";

fn cosigner_sign(request: &str, wif: &str) -> String {
  let mut psbt = Psbt::deserialize(&general_purpose::STANDARD.decode(request).unwrap()).unwrap();

  let detected = detect_bip322_psbt(&psbt).expect("not a BIP-322 signing request");
  let challenge =
    Address::from_script(&detected.message_challenge, bitcoin::Network::Bitcoin).unwrap();

  println!(
    "cosigner: signing message {:?} for address {challenge}",
    String::from_utf8_lossy(&detected.message)
  );

  sign_bip322_psbt_input(&mut psbt, &PrivateKey::from_wif(wif).unwrap(), 0).unwrap();

  general_purpose::STANDARD.encode(psbt.serialize())
}

fn main() {
  let address = Address::from_str(ADDRESS).unwrap().assume_checked();
  let witness_script = ScriptBuf::from_hex(WITNESS_SCRIPT).unwrap();

  let request = general_purpose::STANDARD.encode(
    create_bip322_psbt(
      &address,
      MESSAGE,
      Some(&witness_script),
      &[],
      LockParams::default(),
    )
    .unwrap()
    .serialize(),
  );

  // Cosigners sign each on their own copy of the request.
  let partials = COSIGNER_KEYS
    .iter()
    .map(|wif| cosigner_sign(&request, wif))
    .collect::<Vec<String>>();

  // merge the partial signatures and finalize.
  let mut combined = None::<Psbt>;
  for partial in &partials {
    let psbt = Psbt::deserialize(&general_purpose::STANDARD.decode(partial).unwrap()).unwrap();
    match combined.as_mut() {
      Some(combined) => combined.combine(psbt).unwrap(),
      None => combined = Some(psbt),
    }
  }

  let signature = finalize_bip322_psbt(combined.unwrap()).unwrap();
  println!("signature: {signature}");

  assert!(verify_full_encoded(ADDRESS, MESSAGE, &signature).is_valid());
  println!("verified");
}
