use super::*;

mod creator;
mod finalizer;
mod helpers;
mod prevouts;
mod signer;

pub(crate) use self::{helpers::*, prevouts::*};

pub use {
  creator::create_bip322_psbt, finalizer::finalize_bip322_psbt, signer::sign_bip322_psbt_input,
};

/// Message and challenge extracted from a BIP-322 signing request.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Bip322Psbt {
  /// The UTF-8 encoded message to be signed.
  pub message: Vec<u8>,
  /// The script pubkey being signed for.
  pub message_challenge: ScriptBuf,
}

/// Runs the detection checks on a PSBT.
pub fn detect_bip322_psbt(psbt: &Psbt) -> Option<Bip322Psbt> {
  let message = psbt.unknown.get(&signed_message_key())?.clone();
  std::str::from_utf8(&message).ok()?;

  if psbt.inputs.len() != psbt.unsigned_tx.input.len()
    || psbt.outputs.len() != psbt.unsigned_tx.output.len()
  {
    return None;
  }

  let first = psbt.inputs.first()?;
  let first_txin = psbt.unsigned_tx.input.first()?;

  if first_txin.previous_output.vout != 0 {
    return None;
  }

  let non_witness_utxo = if let Some(tx) = &first.non_witness_utxo {
    if tx.compute_txid() != first_txin.previous_output.txid {
      return None;
    }
    Some(tx.output.get(first_txin.previous_output.vout as usize)?)
  } else {
    None
  };

  if let (Some(witness), Some(non_witness)) = (&first.witness_utxo, non_witness_utxo) {
    if witness != non_witness {
      return None;
    }
  }

  let message_challenge = if let Some(txout) = &first.witness_utxo {
    if txout.value != Amount::ZERO {
      return None;
    }
    txout.script_pubkey.clone()
  } else {
    let txout = non_witness_utxo?;
    if txout.value != Amount::ZERO {
      return None;
    }
    txout.script_pubkey.clone()
  };

  let to_spend = create_to_spend_from_script(&message_challenge, &message);
  if first_txin.previous_output.txid != to_spend.compute_txid() {
    return None;
  }

  if !is_bip322_output(&psbt.unsigned_tx.output) {
    return None;
  }

  Some(Bip322Psbt {
    message,
    message_challenge,
  })
}
