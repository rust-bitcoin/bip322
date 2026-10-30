use {
  super::*,
  bitcoin::{secp256k1::ecdsa, PubkeyHash, WPubkeyHash},
};

/// Verifies a P2PKH spend: scriptSig `<signature> <public key>`.
pub(crate) fn verify_p2pkh(
  spend: &Spend,
  hash: &PubkeyHash,
  sighash_cache: &mut SighashCache<&Transaction>,
) -> Result<()> {
  let mut instructions = spend.txin().script_sig.instructions_minimal();
  let (
    Some(Ok(Instruction::PushBytes(signature))),
    Some(Ok(Instruction::PushBytes(public_key))),
    None,
  ) = (
    instructions.next(),
    instructions.next(),
    instructions.next(),
  )
  else {
    return Err(Error::InvalidWitness);
  };

  let key = BoundPublicKey::p2pkh(hash, public_key.as_bytes())?;
  let signature = parse_ecdsa_signature(signature.as_bytes())?;

  let sighash = sighash_cache
    .legacy_signature_hash(
      spend.input_index(),
      &ScriptBuf::new_p2pkh(hash),
      EcdsaSighashType::All.to_u32(),
    )
    .map_err(|_| Error::ToSignInvalid)?;

  verify_ecdsa(&key, sighash.to_byte_array(), &signature)
}

/// Verifies a P2WPKH spend, native or nested: witness
/// `<signature> <public key>`.
pub(crate) fn verify_p2wpkh(
  spend: &Spend,
  hash: &WPubkeyHash,
  sighash_cache: &mut SighashCache<&Transaction>,
) -> Result<()> {
  let witness = &spend.txin().witness;
  let (Some(signature), Some(public_key)) = (witness.nth(0), witness.nth(1)) else {
    return Err(Error::InvalidWitness);
  };

  let key = BoundPublicKey::p2wpkh(hash, public_key)?;
  let signature = parse_ecdsa_signature(signature)?;

  let sighash = sighash_cache
    .p2wpkh_signature_hash(
      spend.input_index(),
      &ScriptBuf::new_p2wpkh(hash),
      spend.prevout().value,
      EcdsaSighashType::All,
    )
    .map_err(|_| Error::ToSignInvalid)?;

  verify_ecdsa(&key, sighash.to_byte_array(), &signature)
}

/// Verifies a P2WSH CHECKMULTISIG spend, native or nested. `None` hands any
/// other witness script to the interpreter.
pub(crate) fn verify_p2wsh_multisig(
  spend: &Spend,
  witness_script: CommittedScript,
  sighash_cache: &mut SighashCache<&Transaction>,
) -> Result<Option<InputVerification>> {
  let Some((required, keys)) = witness_script.multisig() else {
    return Ok(None);
  };

  let witness = &spend.txin().witness;
  verify_checkmultisig(
    witness.iter().take(witness.len().saturating_sub(1)),
    required,
    &keys,
    || {
      sighash_cache
        .p2wsh_signature_hash(
          spend.input_index(),
          witness_script.script(),
          spend.prevout().value,
          EcdsaSighashType::All,
        )
        .map(|sighash| sighash.to_byte_array())
        .map_err(|_| Error::ToSignInvalid)
    },
  )?;

  Ok(Some(InputVerification::Valid))
}

/// Verifies a bare P2SH CHECKMULTISIG spend. `None` hands any other redeem
/// script to the interpreter.
pub(crate) fn verify_p2sh_multisig(
  spend: &Spend,
  redeem: CommittedScript,
  pushes: &[&[u8]],
  sighash_cache: &mut SighashCache<&Transaction>,
) -> Result<Option<InputVerification>> {
  let Some((required, keys)) = redeem.multisig() else {
    return Ok(None);
  };

  verify_checkmultisig(pushes.iter().copied(), required, &keys, || {
    sighash_cache
      .legacy_signature_hash(
        spend.input_index(),
        redeem.script(),
        EcdsaSighashType::All.to_u32(),
      )
      .map(|sighash| sighash.to_byte_array())
      .map_err(|_| Error::ToSignInvalid)
  })?;

  Ok(Some(InputVerification::Valid))
}

/// Evaluates CHECKMULTISIG over `stack`, the items below the script: the
/// NULLDUMMY element, then exactly `required` signatures. Like the opcode,
/// matching is forward-only: each signature must verify under a key after the
/// previous signature's key.
fn verify_checkmultisig<'a>(
  mut stack: impl ExactSizeIterator<Item = &'a [u8]>,
  required: usize,
  keys: &[BoundPublicKey],
  sighash: impl FnOnce() -> Result<[u8; 32]>,
) -> Result<()> {
  if stack.len() != required + 1 || !stack.next().is_some_and(<[u8]>::is_empty) {
    return Err(Error::InvalidWitness);
  }

  let sighash = Message::from_digest(sighash()?);
  let mut keys = keys.iter();
  for encoded in stack {
    if encoded.is_empty() {
      return Err(Error::InvalidWitness);
    }

    let signature = parse_ecdsa_signature(encoded)?;

    if !keys.any(|key| key.verifies(&sighash, &signature)) {
      return Err(incorrect_signature());
    }
  }

  Ok(())
}

/// Parses an ECDSA signature under BIP-322's required rules: SIGHASH_ALL,
/// then strict DER, then low S.
fn parse_ecdsa_signature(encoded: &[u8]) -> Result<ecdsa::Signature> {
  let Some((&sighash_byte, der)) = encoded.split_last() else {
    return Err(Error::SignatureLength {
      length: 0,
      encoded_signature: Vec::new(),
    });
  };

  let sighash_type = EcdsaSighashType::from_standard(u32::from(sighash_byte))
    .context(error::SigHashTypeNonStandard)?;

  if sighash_type != EcdsaSighashType::All {
    return Err(Error::SigHashTypeUnsupported {
      sighash_type: sighash_type.to_string(),
    });
  }

  let signature = ecdsa::Signature::from_der(der).context(error::SignatureInvalid)?;

  require_low_s(&signature)?;

  Ok(signature)
}

fn verify_ecdsa(
  key: &BoundPublicKey,
  sighash: [u8; 32],
  signature: &ecdsa::Signature,
) -> Result<()> {
  if !key.verifies(&Message::from_digest(sighash), signature) {
    return Err(incorrect_signature());
  }
  Ok(())
}

fn incorrect_signature() -> Error {
  Error::SignatureInvalid {
    source: bitcoin::secp256k1::Error::IncorrectSignature,
  }
}
