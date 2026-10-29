use super::*;

pub(crate) struct Spend<'a> {
  pub(crate) txin: &'a TxIn,
  pub(crate) prevout: &'a TxOut,
  pub(crate) prevouts: &'a [TxOut],
  pub(crate) input_index: usize,
  pub(crate) p2sh: Option<P2shSpend<'a>>,
  pub(crate) witness_program: Option<WitnessProgramSpend<'a>>,
  pub(crate) witness_script: Option<&'a Script>,
  pub(crate) taproot: Option<TaprootSpend<'a>>,
}

pub(crate) struct P2shSpend<'a> {
  pub(crate) pushes: Vec<Vec<u8>>,
  pub(crate) redeem_script: Option<&'a Script>,
  pub(crate) minimal_push_only: bool,
  pub(crate) commitment_valid: bool,
}

pub(crate) struct WitnessProgramSpend<'a> {
  pub(crate) version: bitcoin::WitnessVersion,
  pub(crate) program: &'a [u8],
  pub(crate) nested: bool,
}

pub(crate) struct TaprootSpend<'a> {
  pub(crate) output_key: Option<XOnlyPublicKey>,
  pub(crate) annex: Option<&'a [u8]>,
  pub(crate) path: TaprootPath<'a>,
}

pub(crate) enum TaprootPath<'a> {
  Empty,
  Key { signature: &'a [u8] },
  Script(TaprootScriptSpend<'a>),
}

pub(crate) struct TaprootScriptSpend<'a> {
  pub(crate) initial_stack: Vec<&'a [u8]>,
  pub(crate) tapscript: &'a Script,
  pub(crate) control_block: Option<bitcoin::taproot::ControlBlock>,
}

impl TaprootScriptSpend<'_> {
  pub(crate) fn commitment_valid(&self, output_key: Option<XOnlyPublicKey>) -> bool {
    match (&self.control_block, output_key) {
      (Some(control), Some(output_key)) => control.verify_taproot_commitment(
        &Secp256k1::verification_only(),
        output_key,
        self.tapscript,
      ),
      _ => false,
    }
  }
}

impl<'a> Spend<'a> {
  pub(crate) fn parse(to_sign: &'a Transaction, prevouts: &'a [TxOut], input_index: usize) -> Self {
    use bitcoin::taproot::{ControlBlock, TAPROOT_ANNEX_PREFIX};

    let txin = &to_sign.input[input_index];
    let prevout = &prevouts[input_index];
    let script_pubkey = &prevout.script_pubkey;

    let p2sh = script_pubkey.is_p2sh().then(|| {
      let mut pushes = Vec::new();
      let mut minimal_push_only = true;
      let mut last_data_push = None;
      let mut ends_with_data_push = false;
      for instruction in txin.script_sig.instructions_minimal() {
        match instruction {
          Ok(Instruction::PushBytes(bytes)) => {
            let bytes = bytes.as_bytes();
            pushes.push(bytes.to_vec());
            last_data_push = Some(bytes);
            ends_with_data_push = true;
          }
          Ok(Instruction::Op(opcode)) => {
            match opcode.to_u8() {
              // Script-number pushes are valid minimal stack elements.
              0x4f => pushes.push(vec![0x81]),
              0x51..=0x60 => pushes.push(vec![opcode.to_u8() - 0x50]),
              _ => minimal_push_only = false,
            }
            ends_with_data_push = false;
          }
          Err(_) => {
            minimal_push_only = false;
            ends_with_data_push = false;
          }
        }
      }
      let redeem_script = ends_with_data_push
        .then_some(last_data_push)
        .flatten()
        .map(Script::from_bytes);
      let commitment_valid = redeem_script
        .is_some_and(|redeem| script_pubkey == &ScriptBuf::new_p2sh(&redeem.script_hash()));
      P2shSpend {
        pushes,
        redeem_script,
        minimal_push_only,
        commitment_valid,
      }
    });

    let witness_program = if let Some(version) = script_pubkey.witness_version() {
      Some(WitnessProgramSpend {
        version,
        program: &script_pubkey.as_bytes()[2..],
        nested: false,
      })
    } else {
      p2sh
        .as_ref()
        .and_then(|p2sh| p2sh.redeem_script)
        .and_then(|redeem| {
          redeem.witness_version().map(|version| WitnessProgramSpend {
            version,
            program: &redeem.as_bytes()[2..],
            nested: true,
          })
        })
    };

    let witness_script = (script_pubkey.is_p2wsh() || script_pubkey.is_p2sh())
      .then(|| txin.witness.last().map(Script::from_bytes))
      .flatten()
      .filter(|script| {
        let program = ScriptBuf::new_p2wsh(&script.wscript_hash());
        script_pubkey == &program || script_pubkey == &ScriptBuf::new_p2sh(&program.script_hash())
      });

    let taproot = script_pubkey.is_p2tr().then(|| {
      let output_key = XOnlyPublicKey::from_slice(&script_pubkey.as_bytes()[2..]).ok();
      let items: Vec<&[u8]> = txin.witness.iter().collect();
      let has_annex = items.len() >= 2
        && items
          .last()
          .and_then(|item| item.first())
          .is_some_and(|prefix| *prefix == TAPROOT_ANNEX_PREFIX);
      let annex = has_annex.then_some(items[items.len() - 1]);
      let spend_len = items.len() - usize::from(has_annex);
      let path = match spend_len {
        0 => TaprootPath::Empty,
        1 => TaprootPath::Key {
          signature: items[0],
        },
        _ => {
          let tapscript = Script::from_bytes(items[spend_len - 2]);
          let control_bytes = items[spend_len - 1];
          let control_block = ControlBlock::decode(control_bytes).ok();
          TaprootPath::Script(TaprootScriptSpend {
            initial_stack: items[..spend_len - 2].to_vec(),
            tapscript,
            control_block,
          })
        }
      };
      TaprootSpend {
        output_key,
        annex,
        path,
      }
    });

    Self {
      txin,
      prevout,
      prevouts,
      input_index,
      p2sh,
      witness_program,
      witness_script,
      taproot,
    }
  }

  pub(crate) fn validate_structure(&self) -> Result<()> {
    let requires_minimal = |script: &Script| {
      if script
        .instructions_minimal()
        .any(|instruction| instruction.is_err())
      {
        return Err(Error::InvalidWitness);
      }
      Ok(())
    };
    let validate_script = |script: &Script| {
      requires_minimal(script)?;
      let non_push_opcodes = script
        .instructions()
        .filter(|instruction| {
          matches!(instruction, Ok(Instruction::Op(opcode))
            if opcode.to_u8() > opcodes::all::OP_PUSHNUM_16.to_u8())
        })
        .take(202)
        .count();
      if non_push_opcodes > 201 {
        return Err(Error::InvalidWitness);
      }
      Ok(())
    };
    validate_script(&self.txin.script_sig)?;
    validate_script(&self.prevout.script_pubkey)?;
    if self.witness_program.is_none() {
      if let Some(redeem) = self.p2sh.as_ref().and_then(|p2sh| p2sh.redeem_script) {
        validate_script(redeem)?;
      }
    }
    if let Some(script) = self.witness_script {
      validate_script(script)?;
    }

    if let Some(witness) = &self.witness_program {
      if witness.nested {
        let p2sh = self.p2sh.as_ref().ok_or(Error::ToSignInvalid)?;
        let redeem = p2sh.redeem_script.ok_or(Error::ToSignInvalid)?;
        if !p2sh.minimal_push_only
          || p2sh.pushes.len() != 1
          || !p2sh.commitment_valid
          || self.txin.script_sig != push_only_script(redeem)
        {
          return Err(Error::ToSignInvalid);
        }
      } else if !self.txin.script_sig.is_empty() {
        return Err(Error::ToSignInvalid);
      }

      if witness.version == bitcoin::WitnessVersion::V0 && !matches!(witness.program.len(), 20 | 32)
      {
        return Err(Error::ToSignInvalid);
      }
    } else {
      if self.prevout.script_pubkey.is_p2sh()
        && self
          .p2sh
          .as_ref()
          .is_some_and(|p2sh| p2sh.redeem_script.is_none())
        && !self.txin.witness.is_empty()
      {
        return Err(Error::ToSignInvalid);
      }
      if !self.txin.witness.is_empty() {
        return Err(Error::InvalidWitness);
      }
      if self.prevout.script_pubkey.is_p2sh() {
        let p2sh = self.p2sh.as_ref().ok_or(Error::InvalidWitness)?;
        let redeem = p2sh.redeem_script.ok_or(Error::InvalidWitness)?;
        if !p2sh.minimal_push_only || redeem.len() > 520 {
          return Err(Error::InvalidWitness);
        }
        if !p2sh.commitment_valid {
          return Err(Error::ToSignInvalid);
        }
      }
    }
    Ok(())
  }

  /// Whether this input executes a script containing OP_CODESEPARATOR.
  pub(crate) fn spends_codeseparator(&self) -> bool {
    if contains_codeseparator(&self.txin.script_sig)
      || contains_codeseparator(&self.prevout.script_pubkey)
      || self
        .p2sh
        .as_ref()
        .and_then(|p2sh| p2sh.redeem_script)
        .is_some_and(contains_codeseparator)
      || self.witness_script.is_some_and(contains_codeseparator)
    {
      return true;
    }

    matches!(
      self.taproot.as_ref().map(|taproot| &taproot.path),
      Some(TaprootPath::Script(script))
        if script.control_block.as_ref().is_some_and(|control| {
          control.leaf_version == bitcoin::taproot::LeafVersion::TapScript
        }) && contains_codeseparator(script.tapscript)
    )
  }

  /// Miniscript rejects zero-valued timelocks during decoding, so these exact
  /// naked scripts would otherwise be classified as inconclusive. Under
  /// Bitcoin consensus they execute to a false zero and fail, so reject them as
  /// known-invalid rather than leaving them unverifiable.
  pub(crate) fn has_naked_zero_timelock(&self) -> bool {
    fn is_naked_zero_timelock(script: &Script) -> bool {
      let mut instructions = script.instructions();
      matches!(
        (instructions.next(), instructions.next(), instructions.next()),
        (
          Some(Ok(Instruction::PushBytes(empty))),
          Some(Ok(Instruction::Op(opcode))),
          None
        ) if empty.is_empty()
          && (opcode == opcodes::all::OP_CSV || opcode == opcodes::all::OP_CLTV)
      )
    }

    is_naked_zero_timelock(&self.prevout.script_pubkey)
      || self
        .p2sh
        .as_ref()
        .and_then(|p2sh| p2sh.redeem_script)
        .is_some_and(is_naked_zero_timelock)
      || self.witness_script.is_some_and(is_naked_zero_timelock)
      || matches!(
        self.taproot.as_ref().map(|taproot| &taproot.path),
        Some(TaprootPath::Script(script))
          if script.control_block.as_ref().is_some_and(|control| {
            control.leaf_version == bitcoin::taproot::LeafVersion::TapScript
          }) && is_naked_zero_timelock(script.tapscript)
      )
  }

  pub(crate) fn taproot_initial_stack(&self) -> &[&[u8]] {
    match self.taproot.as_ref().map(|taproot| &taproot.path) {
      Some(TaprootPath::Script(script)) => &script.initial_stack,
      _ => &[],
    }
  }
}

/// Whether a script contains OP_CODESEPARATOR as an opcode (occurrences
/// inside pushed data do not count).
fn contains_codeseparator(script: &Script) -> bool {
  script.instructions().any(
    |instruction| matches!(instruction, Ok(Instruction::Op(opcode)) if opcode == opcodes::all::OP_CODESEPARATOR),
  )
}
