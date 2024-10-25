use super::*;

pub type BIP322Result<T = (), E = error::Error> = std::result::Result<T, E>;

const TAG: &str = "BIP0322-signed-message";

/// Create the tagged message hash.
pub fn message_hash(message: &[u8]) -> Vec<u8> {
  let mut tag_hash = sha256::Hash::hash(TAG.as_bytes()).to_byte_array().to_vec();
  tag_hash.extend(tag_hash.clone());
  tag_hash.extend(message);

  sha256::Hash::hash(tag_hash.as_slice())
    .to_byte_array()
    .to_vec()
}

/// Create the `to_spend` transaction.
pub fn create_to_spend(address: &Address, message: &[u8]) -> BIP322Result<Transaction> {
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
        .push_slice::<&PushBytes>(message_hash(message).as_slice().try_into().unwrap())
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
pub fn create_to_sign(to_spend: &Transaction, witness: Option<Witness>) -> BIP322Result<Psbt> {
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
