use super::*;

pub(crate) fn parse_multisig(script: &bitcoin::Script) -> Result<(usize, Vec<PublicKey>)> {
  let instructions = script
    .instructions_minimal()
    .collect::<std::result::Result<Vec<_>, _>>()
    .map_err(|_| Error::InvalidWitness)?;

  if instructions.len() < 4 {
    return Err(Error::InvalidWitness);
  }

  let pushnum = |op: bitcoin::opcodes::Opcode| -> Result<usize> {
    let value = op.to_u8();
    if (opcodes::all::OP_PUSHNUM_1.to_u8()..=opcodes::all::OP_PUSHNUM_16.to_u8()).contains(&value) {
      Ok((value - opcodes::all::OP_PUSHNUM_1.to_u8() + 1) as usize)
    } else {
      Err(Error::InvalidWitness)
    }
  };

  if !matches!(instructions.last(), Some(Instruction::Op(op)) if *op == opcodes::all::OP_CHECKMULTISIG)
  {
    return Err(Error::InvalidWitness);
  }

  let required_signatures = match &instructions[0] {
    Instruction::Op(op) => pushnum(*op)?,
    _ => return Err(Error::InvalidWitness),
  };

  let total_keys = match &instructions[instructions.len() - 2] {
    Instruction::Op(op) => pushnum(*op)?,
    _ => return Err(Error::InvalidWitness),
  };

  let key_instructions = &instructions[1..instructions.len() - 2];
  if key_instructions.len() != total_keys
    || required_signatures < 1
    || required_signatures > total_keys
  {
    return Err(Error::InvalidWitness);
  }

  let mut pubkeys = Vec::with_capacity(total_keys);
  for instruction in key_instructions {
    match instruction {
      Instruction::PushBytes(bytes) => {
        pubkeys.push(PublicKey::from_slice(bytes.as_bytes()).map_err(|_| Error::InvalidPublicKey)?)
      }
      _ => return Err(Error::InvalidWitness),
    }
  }

  Ok((required_signatures, pubkeys))
}

/// Sign with each private key, ordering signatures by the position of the
/// corresponding public key in the multisig script, as required by
/// OP_CHECKMULTISIG's forward-only matching.
pub(crate) fn ordered_multisig_signatures(
  secp: &Secp256k1<secp256k1::All>,
  script: &ScriptBuf,
  private_keys: &[PrivateKey],
  sighash_message: &secp256k1::Message,
) -> Result<Vec<Vec<u8>>> {
  let (required, pubkeys) = parse_multisig(script)?;

  if private_keys.len() != required {
    return Err(Error::SignatureCount {
      required,
      provided: private_keys.len(),
    });
  }

  let signer_pubkeys: Vec<secp256k1::PublicKey> = private_keys
    .iter()
    .map(|private_key| private_key.public_key(secp).inner)
    .collect();

  for (i, pubkey) in signer_pubkeys.iter().enumerate() {
    if signer_pubkeys[..i].contains(pubkey) {
      return Err(Error::DuplicateSigner);
    }
  }

  let mut used = vec![false; private_keys.len()];
  let mut signatures = Vec::with_capacity(required);

  for pubkey in &pubkeys {
    if let Some(i) =
      (0..signer_pubkeys.len()).find(|&i| !used[i] && signer_pubkeys[i] == pubkey.inner)
    {
      used[i] = true;
      signatures.push(
        bitcoin::ecdsa::Signature {
          signature: secp.sign_ecdsa(sighash_message, &private_keys[i].inner),
          sighash_type: EcdsaSighashType::All,
        }
        .to_vec(),
      );
    }
  }

  if signatures.len() != required {
    return Err(Error::UnknownSigner);
  }

  Ok(signatures)
}

pub(crate) fn push_only_script(script: &Script) -> ScriptBuf {
  ScriptBuf::builder()
    .push_slice(push_bytes(script.as_bytes()))
    .into_script()
}

pub(crate) fn push_bytes(bytes: &[u8]) -> PushBytesBuf {
  let mut push_bytes = bitcoin::script::PushBytesBuf::new();
  push_bytes
    .extend_from_slice(bytes)
    .expect("data fits in push");
  push_bytes
}

/// Enforces the LOW_S rule, a valid ECDSA signature must have a low-S value.
pub(crate) fn require_low_s(signature: &bitcoin::secp256k1::ecdsa::Signature) -> Result<()> {
  let mut normalized = *signature;
  normalized.normalize_s();
  if normalized != *signature {
    return Err(Error::SignatureInvalid {
      source: bitcoin::secp256k1::Error::IncorrectSignature,
    });
  }
  Ok(())
}

/// Whether spending `script_pubkey` is a segwit spend, which decides whether
/// BIP-174 accepts its `witness_utxo` alone or requires the previous
/// transaction in `non_witness_utxo`.
///
/// A P2SH output is segwit if its redeem script is a witness program. With
/// no redeem script known yet, it is assumed to be P2SH-P2WPKH, whose redeem
/// script the signer derives from its own key. This serves producers and the
/// PSBT roles; the verifier instead classifies each spend from its final
/// scriptSig.
pub(crate) fn spends_witness(script_pubkey: &Script, redeem_script: Option<&Script>) -> bool {
  script_pubkey.is_witness_program()
    || (script_pubkey.is_p2sh() && redeem_script.map_or(true, Script::is_witness_program))
}

/// The P2SH redeem script a producer's `witness_script` argument stands for:
/// the script itself for bare P2SH, its P2WSH program for P2SH-P2WSH.
pub(crate) fn p2sh_redeem_script(script_pubkey: &Script, witness_script: &Script) -> ScriptBuf {
  if *script_pubkey == ScriptBuf::new_p2sh(&witness_script.script_hash()) {
    witness_script.to_owned()
  } else {
    ScriptBuf::new_p2wsh(&witness_script.wscript_hash())
  }
}
