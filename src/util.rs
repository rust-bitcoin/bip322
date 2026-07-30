use super::*;

pub const BIP322_TAG: &str = "BIP0322-signed-message";

/// PSBT global key type for the BIP-322 generic signed message
/// (PSBT_GLOBAL_GENERIC_SIGNED_MESSAGE).
pub const PSBT_GLOBAL_GENERIC_SIGNED_MESSAGE: u8 = 0x09;

/// Create the tagged message hash.
pub fn tagged_hash(tag: &str, message: impl AsRef<[u8]>) -> [u8; 32] {
  let tag_hash = Sha256::new().chain_update(tag).finalize();
  Sha256::new()
    .chain_update(tag_hash)
    .chain_update(tag_hash)
    .chain_update(message)
    .finalize()
    .into()
}

/// Create the `to_spend` transaction.
#[allow(clippy::result_large_err)]
pub fn create_to_spend(address: &Address, message: impl AsRef<[u8]>) -> Result<Transaction> {
  Ok(Transaction {
    version: Version(0),
    lock_time: LockTime::ZERO,
    input: vec![TxIn {
      previous_output: OutPoint {
        txid: "0000000000000000000000000000000000000000000000000000000000000000"
          .parse()
          .unwrap(),
        vout: 0xFFFFFFFF,
      },
      script_sig: script::Builder::new()
        .push_int(0)
        .push_slice::<&PushBytes>(
          tagged_hash(BIP322_TAG, message)
            .as_slice()
            .try_into()
            .unwrap(),
        )
        .into_script(),
      sequence: Sequence(0),
      witness: Witness::new(),
    }],
    output: vec![TxOut {
      value: Amount::from_sat(0),
      script_pubkey: address.script_pubkey(),
    }],
  })
}

/// Create the `to_sign` transaction.
#[allow(clippy::result_large_err)]
pub fn create_to_sign(to_spend: &Transaction, witness: Option<Witness>) -> Result<Psbt> {
  let inputs = vec![TxIn {
    previous_output: OutPoint {
      txid: to_spend.compute_txid(),
      vout: 0,
    },
    script_sig: ScriptBuf::new(),
    sequence: Sequence(0),
    witness: Witness::new(),
  }];

  let to_sign = Transaction {
    version: Version(0),
    lock_time: LockTime::ZERO,
    input: inputs,
    output: vec![TxOut {
      value: Amount::from_sat(0),
      script_pubkey: script::Builder::new()
        .push_opcode(opcodes::all::OP_RETURN)
        .into_script(),
    }],
  };

  let mut psbt = Psbt::from_unsigned_tx(to_sign).context(error::PsbtExtract)?;

  psbt.inputs[0].witness_utxo = Some(TxOut {
    value: Amount::from_sat(0),
    script_pubkey: to_spend.output[0].script_pubkey.clone(),
  });

  psbt.inputs[0].final_script_witness = witness;

  Ok(psbt)
}

#[allow(clippy::result_large_err)]
pub(crate) fn parse_multisig(script: &bitcoin::Script) -> Result<(usize, Vec<PublicKey>)> {
  let instructions = script
    .instructions()
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
#[allow(clippy::result_large_err)]
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

pub(crate) fn push_only_script(script: &ScriptBuf) -> ScriptBuf {
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
