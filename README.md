# BIP-322

Implements
[BIP-322](https://github.com/bitcoin/bips/blob/master/bip-0322.mediawiki),
generic message signing and verification.

## Types of Signatures 

- [x] simple (only witness stack, consensus encoded, base64)
- [x] full (base64 encoded `to_sign` tx)
- [ ] proof-of-funds (base64 encoded `to_sign` tx with utxos)


## Compile for WASM (on MacOs)

```
brew install llvm
cargo install wasm-pack
rustup target add wasm32-unknown-unknown
AR=/opt/homebrew/opt/llvm/bin/llvm-ar \
CC=/opt/homebrew/opt/llvm/bin/clang \
wasm-pack build \
    --target web \
    --out-name bip322 \
    www
```

The WASM binary and Javascript glue code can then be found in `www/pkg`.

## Test Vectors

https://github.com/bitcoin/bitcoin/blob/29b28d07fa958b89e1c7916fda5d8654474cf495/src/test/util_tests.cpp#L2747
