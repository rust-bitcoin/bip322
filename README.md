# BIP-322

Implements
[BIP-322](https://github.com/bitcoin/bips/blob/master/bip-0322.mediawiki),
generic message signing and verification.

## Types of Signatures 

The simple format supports native `P2TR`, `P2WPKH` and `P2WSH` addresses. The
full and proof-of-funds formats support all of those plus `P2SH-P2WPKH`,
`P2SH-P2WSH`, `P2SH` CHECKMULTISIG and `P2PKH`. Feedback through issues or
PRs on the interface design and security is welcome and encouraged.

- [x] simple
- [x] full 
- [x] full (proof-of-funds)
- [x] legacy (BIP-137)

Only the dedicated script templates can return `Verification::Valid`. Scripts
evaluated by the miniscript interpreter fallback return
`Verification::Inconclusive` when satisfied, since the fallback cannot prove
every consensus rule. It still returns `Verification::Invalid` when it can
prove a required-rule failure.

The goal is to provide a full signing and verifying library similar to
[this](https://github.com/ACken2/bip322-js/tree/main) Javascript library.

PSBT interoperability is currently limited to PSBTv0. PSBTv2 signing requests
are not supported by the PSBT creator, signer, or finalizer roles.

## Network

A BIP-322 proof binds the `scriptPubKey`, not the network. The same proof can
therefore verify for equivalent mainnet, testnet, or signet `scriptPubKey`s.

The encoded APIs parse addresses with `Address::from_str(..).assume_checked()`
and do not compare the WIF network with the address network. Callers that
require a particular network must enforce that policy themselves.

## Limits

Encoded simple and full proofs are limited to 4 MB decoded, which is
consensus-derived. Encoded proof-of-funds packets are limited to
`MAX_POF_DECODED_SIZE` (16 MiB); larger packets are reported as
`Verification::Inconclusive`. Witnesses over the local item limit are `Invalid`
for v0 addresses and `Inconclusive` for v1 and later, where upgradeable rules
may apply.

## Test Vectors

- from Bitcoin Core [repo](https://github.com/bitcoin/bitcoin/blob/29b28d07fa958b89e1c7916fda5d8654474cf495/src/test/util_tests.cpp#L2747)
- from [bip322-js](https://github.com/ACken2/bip322-js/blob/main/test/Verifier.test.ts)
- from [BIP-322](https://github.com/bitcoin/bips/blob/master/bip-0322.mediawiki#test-vectors)

## MSRV

At the moment the Minimum Supported Rust Version (MSRV) is 1.74.
