# BIP-322

Implements
[BIP-322](https://github.com/bitcoin/bips/blob/master/bip-0322.mediawiki),
generic message signing and verification.

## Types of Signatures 

At the moment this crate supports ONLY P2TR addresses.

- [x] simple
- [x] full 
- [ ] full (proof-of-funds)

## Roadmap

The goal is to provide a full signing and verifying library similar to
[this](https://github.com/ACken2/bip322-js/tree/main) Javascript library.

At the moment this crate supports ONLY `P2TR` addresses. We're looking to
stabilize the interface before implementing different address types. Feedback
through PRs or Issues is welcome and encouraged. 

## Test Vectors

- from Bitcoin Core [repo](https://github.com/bitcoin/bitcoin/blob/29b28d07fa958b89e1c7916fda5d8654474cf495/src/test/util_tests.cpp#L2747)
- from [bip322-js](https://github.com/ACken2/bip322-js/blob/main/test/Verifier.test.ts)
- from [BIP-322](https://github.com/bitcoin/bips/blob/master/bip-0322.mediawiki#test-vectors)

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

The WASM binary and Javascript glue code can then be found in `www/pkg`. The
[bip322.rs](https://bip322.rs) site also runs a small WASM binary if you'd like
to check it out.

