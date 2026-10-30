//! Proof data bound to the output it spends.
//!
//! Every type here keeps its fields private, so the only way to obtain one is
//! through a constructor that checks the proof data against trusted context:
//! the spent scriptPubKey, a script it commits to, or the Taproot output key.
//! Signature verification only accepts these types, so proof data that was
//! never checked against the address cannot reach it.

use {
  super::*,
  bitcoin::{
    secp256k1::ecdsa,
    taproot::{ControlBlock, LeafVersion},
    PubkeyHash, WPubkeyHash,
  },
};

/// A script the spent output commits to: a P2SH redeem script or a P2WSH
/// witness script.
#[derive(Clone, Copy)]
pub(crate) struct CommittedScript<'a>(&'a Script);

impl<'a> CommittedScript<'a> {
  /// `redeem_script`, if `script_pubkey` is its P2SH output.
  pub(crate) fn p2sh(script_pubkey: &Script, redeem_script: &'a Script) -> Option<Self> {
    (script_pubkey.as_bytes() == ScriptBuf::new_p2sh(&redeem_script.script_hash()).as_bytes())
      .then_some(Self(redeem_script))
  }

  /// `witness_script`, if `program` is its P2WSH witness program.
  pub(crate) fn p2wsh(program: &[u8], witness_script: &'a Script) -> Option<Self> {
    (witness_script.wscript_hash().as_byte_array() == program).then_some(Self(witness_script))
  }

  pub(crate) fn script(self) -> &'a Script {
    self.0
  }

  /// The threshold and keys of an `m <keys> n CHECKMULTISIG` script. The keys
  /// are bound because the script that names them is.
  pub(crate) fn multisig(self) -> Option<(usize, Vec<BoundPublicKey>)> {
    let (required, keys) = parse_multisig(self.0).ok()?;
    Some((required, keys.into_iter().map(BoundPublicKey).collect()))
  }
}

/// A public key bound to the spent output: it hashes to the output's key
/// hash, or a committed script names it.
#[derive(Clone, Copy)]
pub(crate) struct BoundPublicKey(PublicKey);

impl BoundPublicKey {
  /// The key `bytes` encode, if it is compressed and hashes to the P2WPKH
  /// program `hash`.
  pub(crate) fn p2wpkh(hash: &WPubkeyHash, bytes: &[u8]) -> Result<Self> {
    let key = PublicKey::from_slice(bytes).map_err(|_| Error::InvalidPublicKey)?;

    if key.wpubkey_hash().context(error::UncompressedPublicKey)? != *hash {
      return Err(Error::PublicKeyMismatch);
    }

    Ok(Self(key))
  }

  /// The key `bytes` encode, if it hashes to the P2PKH key hash `hash`.
  pub(crate) fn p2pkh(hash: &PubkeyHash, bytes: &[u8]) -> Result<Self> {
    let key = PublicKey::from_slice(bytes).map_err(|_| Error::InvalidPublicKey)?;

    if key.pubkey_hash() != *hash {
      return Err(Error::PublicKeyMismatch);
    }

    Ok(Self(key))
  }

  /// Whether `signature` signs `sighash` under this key.
  pub(crate) fn verifies(&self, sighash: &Message, signature: &ecdsa::Signature) -> bool {
    Secp256k1::verification_only()
      .verify_ecdsa(sighash, signature, &self.0.inner)
      .is_ok()
  }
}

/// A Taproot script-path leaf as the witness presents it: the control block,
/// the leaf script, and the number of initial stack items below them. Nothing
/// here is checked against the output key yet.
pub(crate) struct TapLeaf<'a> {
  control: ControlBlock,
  script: &'a Script,
  stack_len: usize,
}

impl<'a> TapLeaf<'a> {
  pub(crate) fn new(control: ControlBlock, script: &'a Script, stack_len: usize) -> Self {
    Self {
      control,
      script,
      stack_len,
    }
  }

  /// The number of initial stack items.
  pub(crate) fn stack_len(&self) -> usize {
    self.stack_len
  }

  /// The leaf script, if the control block claims it is a tapscript. The
  /// claim is not committed to, so it may only feed required-rule scans,
  /// which can reject a proof but never accept one.
  pub(crate) fn claimed_tapscript(&self) -> Option<&'a Script> {
    (self.control.leaf_version == LeafVersion::TapScript).then_some(self.script)
  }

  /// The leaf, if the control block commits `output_key` to it.
  pub(crate) fn commit(&self, output_key: XOnlyPublicKey) -> Option<CommittedLeaf<'a>> {
    self
      .control
      .verify_taproot_commitment(&Secp256k1::verification_only(), output_key, self.script)
      .then_some(CommittedLeaf {
        version: self.control.leaf_version,
        script: self.script,
      })
  }
}

/// A Taproot leaf the output key commits to.
#[derive(Clone, Copy)]
pub(crate) struct CommittedLeaf<'a> {
  version: LeafVersion,
  script: &'a Script,
}

impl<'a> CommittedLeaf<'a> {
  pub(crate) fn version(self) -> LeafVersion {
    self.version
  }

  pub(crate) fn script(self) -> &'a Script {
    self.script
  }
}
