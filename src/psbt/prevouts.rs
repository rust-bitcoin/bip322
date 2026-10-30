use super::*;

pub(crate) fn checked_psbt_input_prevout(
  psbt: &Psbt,
  resolver: &PrevoutResolver,
  index: usize,
) -> Result<TxOut> {
  let prevout = resolver.resolve(index)?;
  let is_segwit = spends_witness(
    &prevout.script_pubkey,
    psbt.inputs[index].redeem_script.as_deref(),
  );
  if !is_segwit && !resolver.has_non_witness(index) {
    return Err(Error::ToSignInvalid);
  }
  Ok(prevout)
}

/// Resolves PSBT previous outputs and indexes non-witness transactions once,
/// avoiding a quadratic scan for the same-transaction fallback.
pub(crate) struct PrevoutResolver<'a> {
  psbt: &'a Psbt,
  non_witness: std::collections::HashMap<bitcoin::Txid, (usize, &'a Transaction)>,
}

impl<'a> PrevoutResolver<'a> {
  pub(crate) fn new(psbt: &'a Psbt) -> Result<Self> {
    let mut non_witness = std::collections::HashMap::new();
    for (index, input) in psbt.inputs.iter().enumerate() {
      let Some(tx) = &input.non_witness_utxo else {
        continue;
      };
      let outpoint = psbt
        .unsigned_tx
        .input
        .get(index)
        .ok_or(Error::ToSignInvalid)?
        .previous_output;
      let txid = tx.compute_txid();
      if txid != outpoint.txid {
        return Err(Error::ToSignInvalid);
      }
      non_witness.entry(txid).or_insert((index, tx));
    }
    Ok(Self { psbt, non_witness })
  }

  fn outpoint(&self, index: usize) -> Result<OutPoint> {
    self
      .psbt
      .unsigned_tx
      .input
      .get(index)
      .map(|input| input.previous_output)
      .ok_or(Error::ToSignInvalid)
  }

  fn non_witness_tx(&self, index: usize) -> Option<&'a Transaction> {
    let outpoint = self.psbt.unsigned_tx.input[index].previous_output;
    self
      .non_witness
      .get(&outpoint.txid)
      .and_then(|(earlier, tx)| (*earlier <= index).then_some(*tx))
  }

  pub(crate) fn has_non_witness(&self, index: usize) -> bool {
    self.non_witness_tx(index).is_some()
  }

  pub(crate) fn resolve(&self, index: usize) -> Result<TxOut> {
    let input = self.psbt.inputs.get(index).ok_or(Error::ToSignInvalid)?;
    let outpoint = self.outpoint(index)?;
    let non_witness = self
      .non_witness_tx(index)
      .map(|tx| {
        tx.output
          .get(outpoint.vout as usize)
          .cloned()
          .ok_or(Error::ToSignInvalid)
      })
      .transpose()?;

    if let (Some(witness), Some(non_witness)) = (&input.witness_utxo, &non_witness) {
      if witness != non_witness {
        return Err(Error::ToSignInvalid);
      }
    }

    input
      .witness_utxo
      .clone()
      .or(non_witness)
      .ok_or(Error::ToSignInvalid)
  }
}
