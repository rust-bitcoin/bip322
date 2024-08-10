use {
  bitcoin::{address::NetworkUnchecked, Address},
  wasm_bindgen::prelude::*,
};

#[wasm_bindgen]
pub fn verify(address: &str, message: &str, signature: &str) -> bool {
  let address = address
    .parse::<Address<NetworkUnchecked>>()
    .unwrap()
    .assume_checked();

  bip322::simple_verify(&address, message, signature)
}
