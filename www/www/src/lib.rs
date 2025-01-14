use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn verify(address: &str, message: &str, signature: &str) -> bool {
  bip322::verify_simple_encoded(&address, message, signature).is_ok()
}
