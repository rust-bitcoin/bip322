use super::*;

fn parse_taproot_signature(encoded: &[u8]) -> Result<(Signature, TapSighashType)> {
  let (signature, sighash_type) = match encoded.len() {
    65 if encoded[64] == 0 => {
      // BIP341: SIGHASH_DEFAULT is valid only in the 64-byte form.
      return Err(Error::SigHashTypeUnsupported {
        sighash_type: TapSighashType::Default.to_string(),
      });
    }
    65 => (
      Signature::from_slice(&encoded[..64]).context(error::SignatureInvalid)?,
      TapSighashType::from_consensus_u8(encoded[64]).context(error::SigHashTypeInvalid)?,
    ),
    64 => (
      Signature::from_slice(encoded).context(error::SignatureInvalid)?,
      TapSighashType::Default,
    ),
    _ => {
      return Err(Error::SignatureLength {
        length: encoded.len(),
        encoded_signature: encoded.to_vec(),
      })
    }
  };

  if sighash_type != TapSighashType::All && sighash_type != TapSighashType::Default {
    return Err(Error::SigHashTypeUnsupported {
      sighash_type: sighash_type.to_string(),
    });
  }

  Ok((signature, sighash_type))
}

pub(crate) fn verify_full_p2tr(
  spend: &Spend,
  sighash_cache: &mut SighashCache<&Transaction>,
) -> Result<InputVerification> {
  use bitcoin::taproot::LeafVersion;

  let taproot = spend.taproot.as_ref().expect("dispatched by P2TR");
  let pub_key = taproot.output_key.ok_or(Error::InvalidPublicKey)?;

  match &taproot.path {
    TaprootPath::Empty => Err(Error::WitnessEmpty),
    TaprootPath::Key { signature } => {
      let (signature, sighash_type) = parse_taproot_signature(signature)?;
      let annex = taproot
        .annex
        .map(sighash::Annex::new)
        .transpose()
        .map_err(|_| Error::InvalidWitness)?;
      let sighash = sighash_cache
        .taproot_signature_hash(
          spend.input_index,
          &sighash::Prevouts::All(spend.prevouts),
          annex,
          None,
          sighash_type,
        )
        .map_err(|_| Error::ToSignInvalid)?;
      let message = Message::from_digest(sighash.to_byte_array());
      Secp256k1::verification_only()
        .verify_schnorr(&signature, &message, &pub_key)
        .context(error::SignatureInvalid)?;

      Ok(if taproot.annex.is_some() {
        InputVerification::Inconclusive
      } else {
        InputVerification::Valid
      })
    }
    TaprootPath::Script(script) => {
      let control = script.control_block.as_ref().ok_or(Error::InvalidWitness)?;
      if !script.commitment_valid(taproot.output_key) {
        return Err(Error::ScriptNotSatisfied);
      }
      if control.leaf_version != LeafVersion::TapScript {
        return Ok(InputVerification::Inconclusive);
      }
      if contains_op_success(script.tapscript) {
        return Ok(InputVerification::Inconclusive);
      }
      if script
        .tapscript
        .instructions_minimal()
        .any(|instruction| instruction.is_err())
      {
        return Err(Error::InvalidWitness);
      }

      if script.tapscript.is_empty() {
        let stack_is_true = script.initial_stack.len() == 1
          && script.initial_stack[0].len() <= 520
          && bitcoin::script::read_scriptbool(script.initial_stack[0]);
        if !stack_is_true {
          return Err(Error::ScriptNotSatisfied);
        }
        return Ok(if taproot.annex.is_some() {
          InputVerification::Inconclusive
        } else {
          InputVerification::Valid
        });
      }

      match parse_simple_tapscript(script.tapscript, &script.initial_stack)? {
        Some(SimpleTapscript::UnknownKey) => Ok(InputVerification::Inconclusive),
        Some(SimpleTapscript::SingleKey(public_key)) => {
          verify_single_key_tapscript(spend, taproot, script, public_key, sighash_cache)?;
          Ok(if taproot.annex.is_some() {
            InputVerification::Inconclusive
          } else {
            InputVerification::Valid
          })
        }
        None if taproot.annex.is_some() => Ok(InputVerification::Inconclusive),
        None => Ok(InputVerification::Unsupported),
      }
    }
  }
}

enum SimpleTapscript {
  SingleKey(XOnlyPublicKey),
  UnknownKey,
}

/// Parses the single-key TapScript template using BIP322's required minimal
/// push rules. Unknown key types retain BIP342's witness-stack semantics.
fn parse_simple_tapscript(
  tapscript: &Script,
  initial_stack: &[&[u8]],
) -> Result<Option<SimpleTapscript>> {
  let mut instructions = tapscript.instructions_minimal();
  let (
    Some(Ok(Instruction::PushBytes(key))),
    Some(Ok(Instruction::Op(opcodes::all::OP_CHECKSIG))),
    None,
  ) = (
    instructions.next(),
    instructions.next(),
    instructions.next(),
  )
  else {
    return Ok(None);
  };

  if initial_stack.len() != 1 {
    return Err(Error::InvalidWitness);
  }
  if initial_stack[0].is_empty() {
    return Err(Error::ScriptNotSatisfied);
  }
  if key.len() > 520 || initial_stack[0].len() > 520 {
    return Err(Error::InvalidWitness);
  }
  if key.is_empty() {
    return Err(Error::ScriptNotSatisfied);
  }
  if key.len() != 32 {
    return Ok(Some(SimpleTapscript::UnknownKey));
  }

  Ok(Some(SimpleTapscript::SingleKey(
    XOnlyPublicKey::from_slice(key.as_bytes()).map_err(|_| Error::InvalidPublicKey)?,
  )))
}

fn verify_single_key_tapscript(
  spend: &Spend,
  taproot: &TaprootSpend,
  script: &TaprootScriptSpend,
  public_key: XOnlyPublicKey,
  sighash_cache: &mut SighashCache<&Transaction>,
) -> Result<()> {
  use bitcoin::taproot::{LeafVersion, TapLeafHash};

  let (signature, sighash_type) = parse_taproot_signature(script.initial_stack[0])?;
  let annex = taproot
    .annex
    .map(sighash::Annex::new)
    .transpose()
    .map_err(|_| Error::InvalidWitness)?;
  let leaf_hash = TapLeafHash::from_script(script.tapscript, LeafVersion::TapScript);
  let sighash = sighash_cache
    .taproot_signature_hash(
      spend.input_index,
      &sighash::Prevouts::All(spend.prevouts),
      annex,
      Some((leaf_hash, 0xffff_ffff)),
      sighash_type,
    )
    .map_err(|_| Error::ToSignInvalid)?;
  Secp256k1::verification_only()
    .verify_schnorr(
      &signature,
      &Message::from_digest(sighash.to_byte_array()),
      &public_key,
    )
    .context(error::SignatureInvalid)?;

  Ok(())
}

fn contains_op_success(script: &Script) -> bool {
  for instruction in script.instructions_minimal() {
    match instruction {
      Ok(Instruction::Op(opcode))
        if matches!(opcode.to_u8(),
          80 | 98 | 126..=129 | 131..=134 | 137..=138 | 141..=142 | 149..=153 | 187..=254) =>
      {
        return true;
      }
      Ok(_) => {}
      Err(_) => return false,
    }
  }
  false
}
