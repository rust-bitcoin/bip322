use {
  bitcoin::{address::NetworkUnchecked, Address},
  wasm_bindgen::prelude::*,
};

#[wasm_bindgen]
pub fn verify(address: &str, message: &str, signature: &str) -> bool {
  bip322::simple_verify(
    &address
      .parse::<Address<NetworkUnchecked>>()
      .unwrap()
      .assume_checked(),
    message,
    signature,
  )
}
