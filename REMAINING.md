# Remaining BIP-322 work

Everything below is deliberately deferred from `feat/verification-enum` and
`feat/official-test-vectors`. Ordered roughly by importance.

## Spec deviations to resolve

1. **CODESEPARATOR / FindAndDelete are `inconclusive`, not `invalid`.**
   The BIP lists their use as a *required* rule — a proof using them must
   verify `invalid`. Neither the script templates nor the miniscript
   interpreter can parse such scripts, so today they fall through to
   `Inconclusive`. This never falsely *accepts*, but it is a state mismatch
   with the spec. Fixing it likely means a pre-scan of the witness/redeem
   script for `OP_CODESEPARATOR` before dispatch, returning
   `Invalid(Error::ScriptNotSatisfied)` or a dedicated variant.

2. **`verify_full` requires exactly one input.** The BIP's basic-validation
   wording says "at least one input". A multi-input raw `to_sign` cannot
   resolve prevouts without PSBT UTXO fields (that's what `pof` is for), so
   rejecting is defensible — but it's a judgment call that should be
   documented or revisited if upstream vectors ever cover it.

3. **No full consensus validation.** The BIP asks that `to_spend` + `to_sign`
   together satisfy all consensus rules (minus the missing input and the
   first-input nSequence / nLockTime exemptions). We check structure and
   script validity, but not e.g. transaction weight, `MAX_MONEY`, or
   sighash-single-style edge cases. Mostly vacuous for these virtual
   transactions, but not literally the spec's requirement.

4. **PoF advisory nSequence reporting.** The BIP says a validator *may*
   report non-zero nSequence values on proof inputs `vin[1..n]`. We ignore
   them (permitted — advisory), but if the API ever wants to expose them,
   `Verification::Valid` would need to grow a field.

## Test coverage gaps

5. **Wrong-signer error vectors.** `generated-test-vectors.json` has 12
   wrong-signer cases (valid signature, wrong address); we cover
   wrong-message equivalents broadly but only a few wrong-signer cases.
   Cheap to add — each is a one-line `case(...)` against `Invalid`.

6. **Empty-signature edge cases.** `""` (empty base64) and `smpAA==`
   (empty witness stack) from `basic-test-vectors.json` are only covered
   indirectly (the `Witness::new()` direct-API test). Pin the encoded
   behavior explicitly.

7. **JSON vectors are hardcoded, not parsed.** All vectors are inlined as
   string literals. Consider a dev-dependency test that parses the two JSON
   files from `bip-0322/` directly, so upstream vector updates fail loudly
   instead of drifting.

## Library/API rough edges

8. **`verify_simple` accepts P2SH-wrapped types** (P2SH-P2WPKH, P2SH
   multisig). The BIP's simple table lists only native segwit
   (P2WPKH/P2WSH/P2TR). Verifier-side leniency is harmless, but note it's a
   deliberate superset.

9. **`.expect()` in `verify_simple`.** `create_to_sign` + `extract_tx` panic
   on failure — unreachable by construction (freshly built transaction with
   a final witness), but it is a panic path in library code. Acceptable
   while the invariant holds; revisit if `create_to_sign` ever becomes
   fallible again.

10. **`Error` is exhaustive.** Every new variant is a breaking change. Mark
    `#[non_exhaustive]` before any 1.0 (harder to add later than now).

11. **`verify_legacy*` keeps `Result<()>`** while the BIP-322 functions
    return `Verification`. Justified (BIP-137 has no inconclusive state and
    no time/age to report), but the two conventions should stay documented.
