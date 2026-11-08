use super::*;

pub(crate) use bitcoin::constants::MAX_SCRIPT_ELEMENT_SIZE;

/// Maximum number of stack items, Bitcoin Core's `MAX_STACK_SIZE`.
pub(crate) const MAX_STACK_SIZE: usize = 1000;

/// Maximum size of a legacy or v0 witness script, Bitcoin Core's
/// `MAX_SCRIPT_SIZE`. Tapscripts are not limited.
pub(crate) const MAX_SCRIPT_SIZE: usize = 10_000;

/// Maximum number of non-push opcodes in a legacy or v0 witness script,
/// Bitcoin Core's `MAX_OPS_PER_SCRIPT`.
pub(crate) const MAX_OPS_PER_SCRIPT: usize = 201;

/// Maximum size of an encoded transaction or witness. Anything larger
/// exceeds the consensus weight limit on its own.
pub(crate) const MAX_ENCODING_SIZE: usize = 4_000_000;

/// Maximum length of the Base64 text encoding of [`MAX_ENCODING_SIZE`] bytes.
pub(crate) const MAX_ENCODED_SIZE: usize = base64_length(MAX_ENCODING_SIZE);

/// Maximum decoded size of a proof of funds accepted by the encoded
/// verifier. Larger proofs are reported as [`Verification::Inconclusive`].
pub const MAX_POF_DECODED_SIZE: usize = 16 * 1024 * 1024;

/// Maximum length of the Base64 text encoding of [`MAX_POF_DECODED_SIZE`]
/// bytes.
pub(crate) const MAX_POF_ENCODED_SIZE: usize = base64_length(MAX_POF_DECODED_SIZE);

/// Maximum length of the Base64 text encoding of a BIP-137 signature, which is
/// always 65 bytes.
pub(crate) const MAX_LEGACY_ENCODED_SIZE: usize = base64_length(65);

/// Maximum number of items in a v0 or v1 witness: the stack, witness script,
/// control block, and annex.
pub(crate) const MAX_WITNESS_ITEMS: usize = MAX_STACK_SIZE + 3;

/// The length of the padded Base64 encoding of `bytes` bytes.
const fn base64_length(bytes: usize) -> usize {
  let groups = match bytes.checked_add(2) {
    Some(bytes) => bytes / 3,
    None => return usize::MAX,
  };
  match groups.checked_mul(4) {
    Some(length) => length,
    None => usize::MAX,
  }
}

/// Maximum total inputs (challenge plus proven UTXOs) allowed in a Proof of
/// Funds. Verification bounds its work to this many inputs and reports
/// larger proofs as [`Verification::Inconclusive`], so producers reject them
/// rather than create proofs this crate cannot verify.
pub const MAX_PROOF_INPUTS: usize = 1024;

/// Rejects a proof of funds with more than [`MAX_PROOF_INPUTS`] inputs in
/// total, which this crate would not verify.
pub(crate) fn check_input_count(total: usize) -> Result<()> {
  if total > MAX_PROOF_INPUTS {
    return Err(Error::TooManyProofInputs {
      count: total,
      max: MAX_PROOF_INPUTS,
    });
  }
  Ok(())
}
