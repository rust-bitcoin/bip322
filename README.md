# BIP-322

Implements
[BIP-322](https://github.com/bitcoin/bips/blob/master/bip-0322.mediawiki),
generic message signing and verification.


## Types of Signatures 

- simple (only witness stack, consensus encoded, base64)
- full (base64 encoded `to_sign`)
- proof-of-funds (add utxos to `to_sign`)
- No need to implement legacy  

## Test Vectors

https://github.com/bitcoin/bitcoin/blob/29b28d07fa958b89e1c7916fda5d8654474cf495/src/test/util_tests.cpp#L2747

## Compile for WASM

For MacOs:

```
brew install llvm
cargo install wasm-pack
rustup target add wasm32-unknown-unknown
cd www
AR=/opt/homebrew/opt/llvm/bin/llvm-ar \
CC=/opt/homebrew/opt/llvm/bin/clang \
    wasm-pack build --target web
```
