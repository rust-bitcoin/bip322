use {
  super::*,
  bitcoin::{taproot::TAPROOT_ANNEX_PREFIX, PubkeyHash, WPubkeyHash, WitnessVersion},
};

/// Stack elements of the script-number opcodes `OP_1NEGATE` and `OP_1` to
/// `OP_16`, so a scriptSig's stack can borrow them like its data pushes.
static SCRIPT_NUMBERS: [[u8; 1]; 17] = [
  [0x81],
  [1],
  [2],
  [3],
  [4],
  [5],
  [6],
  [7],
  [8],
  [9],
  [10],
  [11],
  [12],
  [13],
  [14],
  [15],
  [16],
];

/// An input of `to_sign`, parsed against the output it spends.
///
/// Only [`Spend::parse`] builds one, and it enforces the structural consensus
/// rules of the output type. Every script and key hash a `Spend` holds is
/// either taken from the spent scriptPubKey or checked against it.
pub(crate) struct Spend<'a> {
  to_sign: &'a Transaction,
  input_index: usize,
  prevouts: &'a [TxOut],
  kind: SpendKind<'a>,
}

pub(crate) enum SpendKind<'a> {
  /// P2PKH, with the key hash from the spent scriptPubKey.
  P2pkh(PubkeyHash),
  /// Bare P2SH: the committed redeem script, and the scriptSig's stack below
  /// it.
  P2sh {
    redeem: CommittedScript<'a>,
    pushes: Vec<&'a [u8]>,
  },
  /// P2WPKH, native or nested. The key hash comes from the spent scriptPubKey
  /// or a committed redeem script.
  P2wpkh(WPubkeyHash),
  /// P2WSH, native or nested.
  P2wsh(CommittedScript<'a>),
  /// P2TR, with the output key from the spent scriptPubKey.
  P2tr {
    output_key: XOnlyPublicKey,
    annex: Option<&'a [u8]>,
    path: TaprootPath<'a>,
  },
  /// A witness program reserved for upgrades.
  UnknownWitness,
  /// Any other scriptPubKey, which only the interpreter can evaluate.
  Bare,
}

pub(crate) enum TaprootPath<'a> {
  Key { signature: &'a [u8] },
  Script(TapLeaf<'a>),
}

impl<'a> Spend<'a> {
  /// Parses input `input_index` of `to_sign` against `prevouts[input_index]`.
  pub(crate) fn parse(
    to_sign: &'a Transaction,
    prevouts: &'a [TxOut],
    input_index: usize,
  ) -> Result<Self> {
    let (Some(txin), Some(prevout)) = (to_sign.input.get(input_index), prevouts.get(input_index))
    else {
      return Err(Error::ToSignInvalid);
    };
    let script_pubkey = prevout.script_pubkey.as_script();

    check_script(&txin.script_sig)?;
    check_script(script_pubkey)?;

    let kind = if let Some(version) = script_pubkey.witness_version() {
      if !txin.script_sig.is_empty() {
        return Err(Error::ToSignInvalid);
      }
      witness_kind(
        &txin.witness,
        version,
        &script_pubkey.as_bytes()[2..],
        false,
      )?
    } else if script_pubkey.is_p2sh() {
      p2sh_kind(txin, script_pubkey)?
    } else if !txin.witness.is_empty() {
      return Err(Error::InvalidWitness);
    } else if script_pubkey.is_p2pkh() {
      SpendKind::P2pkh(
        PubkeyHash::from_slice(&script_pubkey.as_bytes()[3..23])
          .map_err(|_| Error::ToSignInvalid)?,
      )
    } else {
      SpendKind::Bare
    };

    Ok(Self {
      to_sign,
      input_index,
      prevouts,
      kind,
    })
  }

  pub(crate) fn to_sign(&self) -> &'a Transaction {
    self.to_sign
  }

  pub(crate) fn input_index(&self) -> usize {
    self.input_index
  }

  /// The previous outputs of every input of `to_sign`.
  pub(crate) fn prevouts(&self) -> &'a [TxOut] {
    self.prevouts
  }

  pub(crate) fn txin(&self) -> &'a TxIn {
    &self.to_sign.input[self.input_index]
  }

  /// The previous output this input spends.
  pub(crate) fn prevout(&self) -> &'a TxOut {
    &self.prevouts[self.input_index]
  }

  pub(crate) fn kind(&self) -> &SpendKind<'a> {
    &self.kind
  }

  /// Whether this is a segwit spend, for which BIP-174 accepts a
  /// `witness_utxo` without the previous transaction.
  pub(crate) fn is_witness(&self) -> bool {
    matches!(
      self.kind,
      SpendKind::P2wpkh(_)
        | SpendKind::P2wsh(_)
        | SpendKind::P2tr { .. }
        | SpendKind::UnknownWitness
    )
  }

  /// The initial stack of a Taproot script-path spend: the witness without
  /// the leaf script, control block and annex.
  pub(crate) fn taproot_stack(&self) -> std::iter::Take<bitcoin::witness::Iter<'a>> {
    let stack_len = match &self.kind {
      SpendKind::P2tr {
        path: TaprootPath::Script(leaf),
        ..
      } => leaf.stack_len(),
      _ => 0,
    };
    self.txin().witness.iter().take(stack_len)
  }

  /// Whether this input executes a script containing OP_CODESEPARATOR.
  pub(crate) fn spends_codeseparator(&self) -> bool {
    [
      Some(self.txin().script_sig.as_script()),
      Some(self.prevout().script_pubkey.as_script()),
      self.inner_script(),
    ]
    .into_iter()
    .flatten()
    .any(contains_codeseparator)
  }

  /// Miniscript rejects zero-valued timelocks during decoding, so these exact
  /// naked scripts would otherwise be classified as inconclusive. Under
  /// Bitcoin consensus they execute to a false zero and fail, so reject them as
  /// known-invalid rather than leaving them unverifiable.
  pub(crate) fn has_naked_zero_timelock(&self) -> bool {
    [
      Some(self.prevout().script_pubkey.as_script()),
      self.inner_script(),
    ]
    .into_iter()
    .flatten()
    .any(is_naked_zero_timelock)
  }

  /// The script this input executes after its scriptPubKey: the committed
  /// redeem or witness script, or the tapscript a script-path witness claims.
  /// The tapscript is not committed to yet, so this may only feed
  /// required-rule scans, which can reject a proof but never accept one.
  fn inner_script(&self) -> Option<&'a Script> {
    match &self.kind {
      SpendKind::P2sh { redeem, .. } => Some(redeem.script()),
      SpendKind::P2wsh(witness_script) => Some(witness_script.script()),
      SpendKind::P2tr {
        path: TaprootPath::Script(leaf),
        ..
      } => leaf.claimed_tapscript(),
      _ => None,
    }
  }
}

/// Classifies a witness program, native or nested in P2SH, and enforces the
/// structural rules of its witness.
fn witness_kind<'a>(
  witness: &'a Witness,
  version: WitnessVersion,
  program: &'a [u8],
  nested: bool,
) -> Result<SpendKind<'a>> {
  match (nested, version, program.len()) {
    (_, WitnessVersion::V0, 20) => {
      if witness.is_empty() {
        return Err(Error::WitnessEmpty);
      }
      if witness.len() != 2 {
        return Err(Error::InvalidWitness);
      }
      check_witness_stack(witness.iter())?;

      Ok(SpendKind::P2wpkh(
        WPubkeyHash::from_slice(program).map_err(|_| Error::ToSignInvalid)?,
      ))
    }
    (_, WitnessVersion::V0, 32) => {
      let witness_script = witness
        .last()
        .map(Script::from_bytes)
        .ok_or(Error::InvalidWitness)?;
      let witness_script =
        CommittedScript::p2wsh(program, witness_script).ok_or(Error::ToSignInvalid)?;
      check_witness_stack(witness.iter().take(witness.len() - 1))?;
      check_script(witness_script.script())?;

      Ok(SpendKind::P2wsh(witness_script))
    }
    (_, WitnessVersion::V0, _) => Err(Error::ToSignInvalid),
    (false, WitnessVersion::V1, 32) => taproot_kind(witness, program),
    _ => Ok(SpendKind::UnknownWitness),
  }
}

/// Splits a Taproot witness into its annex and spending path.
fn taproot_kind<'a>(witness: &'a Witness, program: &[u8]) -> Result<SpendKind<'a>> {
  use bitcoin::taproot::ControlBlock;

  let output_key = XOnlyPublicKey::from_slice(program).map_err(|_| Error::InvalidPublicKey)?;

  let annex = witness
    .last()
    .filter(|last| witness.len() >= 2 && last.first() == Some(&TAPROOT_ANNEX_PREFIX));
  let spend_len = witness.len() - usize::from(annex.is_some());

  let path = match spend_len {
    0 => return Err(Error::WitnessEmpty),
    1 => TaprootPath::Key {
      signature: witness.nth(0).ok_or(Error::WitnessEmpty)?,
    },
    _ => {
      let script = witness
        .nth(spend_len - 2)
        .map(Script::from_bytes)
        .ok_or(Error::InvalidWitness)?;
      let control = witness
        .nth(spend_len - 1)
        .and_then(|control| ControlBlock::decode(control).ok())
        .ok_or(Error::InvalidWitness)?;
      TaprootPath::Script(TapLeaf::new(control, script, spend_len - 2))
    }
  };

  Ok(SpendKind::P2tr {
    output_key,
    annex,
    path,
  })
}

/// Classifies a P2SH spend from its scriptSig, the last push of which is the
/// redeem script.
fn p2sh_kind<'a>(txin: &'a TxIn, script_pubkey: &Script) -> Result<SpendKind<'a>> {
  let mut pushes = Vec::new();
  let mut push_only = true;
  let mut ends_with_data = false;
  for instruction in txin.script_sig.instructions_minimal() {
    match instruction.map_err(|_| Error::InvalidWitness)? {
      Instruction::PushBytes(bytes) => {
        pushes.push(bytes.as_bytes());
        ends_with_data = true;
      }
      Instruction::Op(opcode) => {
        match opcode.to_u8() {
          0x4f => pushes.push(&SCRIPT_NUMBERS[0][..]),
          number @ 0x51..=0x60 => pushes.push(&SCRIPT_NUMBERS[usize::from(number - 0x50)][..]),
          _ => push_only = false,
        }
        ends_with_data = false;
      }
    }

    if pushes.len() > MAX_STACK_SIZE {
      return Err(Error::InvalidWitness);
    }
  }

  let redeem_script = if ends_with_data {
    pushes.pop().map(Script::from_bytes)
  } else {
    None
  };

  if let Some((redeem_script, version)) =
    redeem_script.and_then(|redeem| Some((redeem, redeem.witness_version()?)))
  {
    // Nested segwit: the scriptSig must be exactly the push of the program.
    let redeem_script =
      CommittedScript::p2sh(script_pubkey, redeem_script).ok_or(Error::ToSignInvalid)?;
    if txin.script_sig != push_only_script(redeem_script.script()) {
      return Err(Error::ToSignInvalid);
    }
    return witness_kind(
      &txin.witness,
      version,
      &redeem_script.script().as_bytes()[2..],
      true,
    );
  }

  if !txin.witness.is_empty() {
    return Err(Error::InvalidWitness);
  }
  let redeem_script = redeem_script.ok_or(Error::InvalidWitness)?;
  if !push_only
    || redeem_script.len() > MAX_SCRIPT_ELEMENT_SIZE
    || pushes
      .iter()
      .any(|push| push.len() > MAX_SCRIPT_ELEMENT_SIZE)
  {
    return Err(Error::InvalidWitness);
  }
  let redeem = CommittedScript::p2sh(script_pubkey, redeem_script).ok_or(Error::ToSignInvalid)?;
  check_script(redeem.script())?;

  Ok(SpendKind::P2sh { redeem, pushes })
}

/// Enforces the limits every executed legacy and v0 witness script obeys: at
/// most `MAX_SCRIPT_SIZE` bytes, minimal pushes, and at most
/// `MAX_OPS_PER_SCRIPT` non-push opcodes.
fn check_script(script: &Script) -> Result<()> {
  if script.len() > MAX_SCRIPT_SIZE {
    return Err(Error::InvalidWitness);
  }

  let mut non_push_opcodes = 0;
  for instruction in script.instructions_minimal() {
    match instruction {
      Ok(Instruction::Op(opcode)) if opcode.to_u8() > opcodes::all::OP_PUSHNUM_16.to_u8() => {
        non_push_opcodes += 1;
        if non_push_opcodes > MAX_OPS_PER_SCRIPT {
          return Err(Error::InvalidWitness);
        }
      }
      Ok(_) => {}
      Err(_) => return Err(Error::InvalidWitness),
    }
  }

  Ok(())
}

/// Enforces the v0 witness stack limits: at most `MAX_STACK_SIZE` items of
/// at most `MAX_SCRIPT_ELEMENT_SIZE` bytes each.
fn check_witness_stack<'a>(mut stack: impl ExactSizeIterator<Item = &'a [u8]>) -> Result<()> {
  if stack.len() > MAX_STACK_SIZE || stack.any(|item| item.len() > MAX_SCRIPT_ELEMENT_SIZE) {
    return Err(Error::InvalidWitness);
  }
  Ok(())
}

/// Whether a script contains OP_CODESEPARATOR as an opcode (occurrences
/// inside pushed data do not count).
fn contains_codeseparator(script: &Script) -> bool {
  script.instructions().any(
    |instruction| matches!(instruction, Ok(Instruction::Op(opcode)) if opcode == opcodes::all::OP_CODESEPARATOR),
  )
}

/// Whether a script is exactly `0 OP_CHECKSEQUENCEVERIFY` or
/// `0 OP_CHECKLOCKTIMEVERIFY`.
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
