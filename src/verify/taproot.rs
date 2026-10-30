use {
  super::*,
  bitcoin::{
    opcodes::{Class, ClassifyContext},
    taproot::{LeafVersion, TapLeafHash},
  },
};

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

/// Verifies a P2TR spend. `None` hands a committed tapscript no template
/// matches to the interpreter.
pub(crate) fn verify_p2tr(
  spend: &Spend,
  output_key: XOnlyPublicKey,
  annex: Option<&[u8]>,
  path: &TaprootPath,
  sighash_cache: &mut SighashCache<&Transaction>,
) -> Result<Option<InputVerification>> {
  // The annex is reserved for upgrades, so a spend using it is at best
  // inconclusive.
  let satisfied = if annex.is_some() {
    InputVerification::Inconclusive
  } else {
    InputVerification::Valid
  };

  let leaf = match path {
    TaprootPath::Key { signature } => {
      verify_schnorr(spend, annex, None, signature, &output_key, sighash_cache)?;
      return Ok(Some(satisfied));
    }
    TaprootPath::Script(leaf) => leaf,
  };

  let stack_len = leaf.stack_len();
  let leaf = leaf.commit(output_key).ok_or(Error::ScriptNotSatisfied)?;
  if leaf.version() != LeafVersion::TapScript {
    return Ok(Some(InputVerification::Inconclusive));
  }

  let tapscript = leaf.script();

  // OP_SUCCESSx overrides every other rule, including the stack limits.
  if contains_op_success(tapscript) {
    return Ok(Some(InputVerification::Inconclusive));
  }
  if stack_len > MAX_STACK_SIZE
    || spend
      .taproot_stack()
      .any(|item| item.len() > MAX_SCRIPT_ELEMENT_SIZE)
  {
    return Err(Error::InvalidWitness);
  }
  if tapscript
    .instructions_minimal()
    .any(|instruction| instruction.is_err())
  {
    return Err(Error::InvalidWitness);
  }

  if tapscript.is_empty() {
    // BIP342: an empty tapscript leaves the initial stack, which must then
    // be exactly one true element.
    let true_stack = stack_len == 1
      && spend
        .taproot_stack()
        .next()
        .is_some_and(bitcoin::script::read_scriptbool);
    if !true_stack {
      return Err(Error::ScriptNotSatisfied);
    }
    return Ok(Some(satisfied));
  }

  match parse_simple_tapscript(tapscript, stack_len, spend.taproot_stack().next())? {
    Some(SimpleTapscript::UnknownKey) => Ok(Some(InputVerification::Inconclusive)),
    Some(SimpleTapscript::SingleKey { key, signature }) => {
      let leaf_hash = TapLeafHash::from_script(tapscript, LeafVersion::TapScript);
      verify_schnorr(
        spend,
        annex,
        Some(leaf_hash),
        signature,
        &key,
        sighash_cache,
      )?;
      Ok(Some(satisfied))
    }
    None if annex.is_some() => {
      verify_taproot_annex_required_rules(spend)?;
      Ok(Some(InputVerification::Inconclusive))
    }
    None => Ok(None),
  }
}

enum SimpleTapscript<'a> {
  SingleKey {
    key: XOnlyPublicKey,
    signature: &'a [u8],
  },
  UnknownKey,
}

/// Parses the single-key `<key> OP_CHECKSIG` tapscript template using
/// BIP-322's required minimal push rules. Unknown key types retain BIP342's
/// witness-stack semantics.
fn parse_simple_tapscript<'a>(
  tapscript: &Script,
  stack_len: usize,
  first: Option<&'a [u8]>,
) -> Result<Option<SimpleTapscript<'a>>> {
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

  let (1, Some(signature)) = (stack_len, first) else {
    return Err(Error::InvalidWitness);
  };
  if signature.is_empty() {
    return Err(Error::ScriptNotSatisfied);
  }
  if key.len() > MAX_SCRIPT_ELEMENT_SIZE {
    return Err(Error::InvalidWitness);
  }
  if key.is_empty() {
    return Err(Error::ScriptNotSatisfied);
  }
  if key.len() != 32 {
    return Ok(Some(SimpleTapscript::UnknownKey));
  }

  Ok(Some(SimpleTapscript::SingleKey {
    key: XOnlyPublicKey::from_slice(key.as_bytes()).map_err(|_| Error::InvalidPublicKey)?,
    signature,
  }))
}

/// Verifies a Schnorr signature over the key path (`leaf_hash` is `None`) or
/// a tapscript leaf. The key is the output key or one a committed leaf names.
fn verify_schnorr(
  spend: &Spend,
  annex: Option<&[u8]>,
  leaf_hash: Option<TapLeafHash>,
  encoded_signature: &[u8],
  key: &XOnlyPublicKey,
  sighash_cache: &mut SighashCache<&Transaction>,
) -> Result<()> {
  let (signature, sighash_type) = parse_taproot_signature(encoded_signature)?;
  let annex = annex
    .map(sighash::Annex::new)
    .transpose()
    .map_err(|_| Error::InvalidWitness)?;

  let sighash = sighash_cache
    .taproot_signature_hash(
      spend.input_index(),
      &sighash::Prevouts::All(spend.prevouts()),
      annex,
      leaf_hash.map(|leaf_hash| (leaf_hash, 0xffff_ffff)),
      sighash_type,
    )
    .map_err(|_| Error::ToSignInvalid)?;

  Secp256k1::verification_only()
    .verify_schnorr(
      &signature,
      &Message::from_digest(sighash.to_byte_array()),
      key,
    )
    .context(error::SignatureInvalid)
}

/// Whether the tapscript contains an OP_SUCCESSx opcode before its first
/// undecodable or non-minimal push.
fn contains_op_success(tapscript: &Script) -> bool {
  for instruction in tapscript.instructions_minimal() {
    match instruction {
      Ok(Instruction::Op(opcode))
        if opcode.classify(ClassifyContext::TapScript) == Class::SuccessOp =>
      {
        return true
      }
      Ok(_) => {}
      Err(_) => return false,
    }
  }
  false
}
