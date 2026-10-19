//! Proving control of a set of UTXOs alongside a signed message, using the
//! BIP-322 "full (proof of funds)" variant.

use {
  bip322::{sign_pof_encoded, verify_pof_encoded, LockParams, ProofInput, Verification},
  bitcoin::{Address, Amount, OutPoint, PrivateKey, TxOut},
  std::str::FromStr,
};

const ADDRESS: &str = "bc1q9vza2e8x573nczrlzms0wvx3gsqjx7vavgkx0l";
const WIF_PRIVATE_KEY: &str = "L3VFeEujGtevx9w18HD1fhRbCH67Az2dpCymeRE1SoPK6XQtaN2k";
const MESSAGE: &str = "I control these coins; (50, 000sat) and (125,000sat)";

fn main() {
  let address = Address::from_str(ADDRESS).unwrap().assume_checked();
  let private_key = PrivateKey::from_wif(WIF_PRIVATE_KEY).unwrap();

  let utxos = [
    (
      "1111111111111111111111111111111111111111111111111111111111111111:0",
      50_000,
    ),
    (
      "2222222222222222222222222222222222222222222222222222222222222222:1",
      125_000,
    ),
  ];

  let inputs = utxos
    .iter()
    .map(|(outpoint, sats)| ProofInput {
      outpoint: OutPoint::from_str(outpoint).unwrap(),
      prevout: TxOut {
        value: Amount::from_sat(*sats),
        script_pubkey: address.script_pubkey(),
      },
      // Would only needed for legacy (non-segwit) inputs
      prev_tx: None,
      private_keys: vec![private_key],
      witness_script: None,
    })
    .collect::<Vec<ProofInput>>();

  let signature = sign_pof_encoded(
    ADDRESS,
    MESSAGE,
    &[WIF_PRIVATE_KEY],
    None,
    &inputs,
    LockParams::default(),
  )
  .unwrap();

  println!("signature: {signature}");

  match verify_pof_encoded(ADDRESS, MESSAGE, &signature) {
    Verification::Valid { .. } => {
      let total = inputs
        .iter()
        .map(|input| input.prevout.value)
        .sum::<Amount>();
      println!(
        "valid: signer controls {} UTXOs worth {total}, pending UTXO set lookup",
        inputs.len()
      );
    }
    Verification::Inconclusive => panic!("verifier could not interpret a script"),
    Verification::Invalid(error) => panic!("invalid proof: {error}"),
  }
}
