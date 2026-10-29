use super::*;

/// Enforces the consensus transaction weight limit.
pub(crate) fn validate_weight(transaction: &Transaction) -> Result<()> {
  if transaction.weight() > bitcoin::Weight::MAX_BLOCK {
    return Err(Error::ToSignInvalid);
  }
  Ok(())
}

/// Validates transaction outpoints against consensus structural rules.
pub(crate) fn validate_outpoints(transaction: &Transaction) -> Result<()> {
  let mut outpoints = std::collections::HashSet::with_capacity(transaction.input.len());
  if transaction
    .input
    .iter()
    .any(|input| input.previous_output.is_null() || !outpoints.insert(input.previous_output))
  {
    return Err(Error::ToSignInvalid);
  }
  Ok(())
}

/// Validates PSBT map cardinality and transaction outpoints.
pub(crate) fn validate_psbt_structure(psbt: &Psbt) -> Result<()> {
  if psbt.inputs.len() != psbt.unsigned_tx.input.len()
    || psbt.outputs.len() != psbt.unsigned_tx.output.len()
  {
    return Err(Error::ToSignInvalid);
  }
  validate_outpoints(&psbt.unsigned_tx)
}
