//! Bounds checks on attacker-supplied encodings, run before rust-bitcoin
//! decodes them.
//!
//! rust-bitcoin allocates from CompactSize counts and lengths before reading
//! the data they describe, so every count and length is first checked against
//! the bytes actually present. These checks never allocate. The unbounded
//! witness and transaction checks accept every encoding rust-bitcoin decodes,
//! reporting the same shape. The bounded preflights additionally report
//! witnesses with more items than a caller-supplied limit, leaving the caller
//! to decide whether that limit is a required rule or an upgradeable one.

use super::*;

/// PSBT key types whose values rust-bitcoin decodes into allocating types.
const PSBT_GLOBAL_UNSIGNED_TX: u8 = 0x00;
const PSBT_IN_NON_WITNESS_UTXO: u8 = 0x00;
const PSBT_IN_FINAL_SCRIPTWITNESS: u8 = 0x08;

/// The input and output counts of a PSBT's unsigned transaction, which are
/// also the numbers of input and output maps rust-bitcoin allocates.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) struct PsbtShape {
  pub(crate) inputs: usize,
  pub(crate) outputs: usize,
}

/// The result of a preflight check.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum Check<T> {
  /// The value is structurally valid.
  Valid(T),
  /// The value is structurally malformed.
  Malformed,
  /// The value is structurally valid but exceeds the witness item limit.
  OverLimit,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum PreflightError {
  Malformed,
  OverLimit,
}

/// Checks a consensus-encoded witness.
#[cfg(test)]
pub(crate) fn witness(bytes: &[u8]) -> bool {
  matches!(witness_with_limit(bytes, None), Check::Valid(()))
}

/// Checks a consensus-encoded witness with at most `max_items` items when
/// `max_items` is set.
pub(crate) fn witness_with_limit(bytes: &[u8], max_items: Option<usize>) -> Check<()> {
  check(Cursor::new(bytes).witness(max_items))
}

/// Checks a consensus-encoded transaction.
#[cfg(test)]
pub(crate) fn transaction(bytes: &[u8]) -> bool {
  matches!(transaction_with_limit(bytes, None), Check::Valid(()))
}

/// Checks a consensus-encoded transaction with at most `max_items` items per
/// witness when `max_items` is set.
pub(crate) fn transaction_with_limit(bytes: &[u8], max_items: Option<usize>) -> Check<()> {
  check(Cursor::new(bytes).transaction(max_items))
}

fn check(result: Result<(), PreflightError>) -> Check<()> {
  match result {
    Ok(()) => Check::Valid(()),
    Err(PreflightError::Malformed) => Check::Malformed,
    Err(PreflightError::OverLimit) => Check::OverLimit,
  }
}

/// Checks a PSBT and returns the shape of its unsigned transaction. Witness
/// item counts are bounded; `OverLimit` reports a PSBT whose final witness or
/// previous transaction may be upgradeable but exceeds the limit.
pub(crate) fn psbt(bytes: &[u8]) -> Check<PsbtShape> {
  match psbt_inner(bytes) {
    Ok(shape) => Check::Valid(shape),
    Err(PreflightError::Malformed) => Check::Malformed,
    Err(PreflightError::OverLimit) => Check::OverLimit,
  }
}

fn psbt_inner(bytes: &[u8]) -> Result<PsbtShape, PreflightError> {
  let mut cursor = Cursor::new(bytes);
  if cursor.take(5).ok_or(PreflightError::Malformed)? != b"psbt\xff" {
    return Err(PreflightError::Malformed);
  }

  let mut shape = None;
  loop {
    let pair = cursor.pair().ok_or(PreflightError::Malformed)?;
    let Some(pair) = pair else {
      break;
    };
    if pair.key_type == PSBT_GLOBAL_UNSIGNED_TX && pair.key_data.is_empty() {
      // rust-bitcoin rejects a second unsigned transaction.
      if shape.is_some() {
        return Err(PreflightError::Malformed);
      }
      let mut unsigned_tx = Cursor::new(pair.value);
      shape = Some(
        unsigned_tx
          .unsigned_transaction()
          .ok_or(PreflightError::Malformed)?,
      );
      if unsigned_tx.remaining() != 0 {
        return Err(PreflightError::Malformed);
      }
    }
  }
  let shape = shape.ok_or(PreflightError::Malformed)?;

  for _ in 0..shape.inputs {
    loop {
      let pair = cursor.pair().ok_or(PreflightError::Malformed)?;
      let Some(pair) = pair else {
        break;
      };
      if !pair.key_data.is_empty() {
        continue;
      }
      match pair.key_type {
        PSBT_IN_NON_WITNESS_UTXO => {
          if pair.value.len() > MAX_ENCODING_SIZE {
            return Err(PreflightError::Malformed);
          }
          match transaction_with_limit(pair.value, Some(MAX_WITNESS_ITEMS)) {
            Check::Valid(()) => {}
            Check::Malformed => return Err(PreflightError::Malformed),
            Check::OverLimit => return Err(PreflightError::OverLimit),
          }
        }
        PSBT_IN_FINAL_SCRIPTWITNESS => {
          if pair.value.len() > MAX_ENCODING_SIZE {
            return Err(PreflightError::Malformed);
          }
          match witness_with_limit(pair.value, Some(MAX_WITNESS_ITEMS)) {
            Check::Valid(()) => {}
            Check::Malformed => return Err(PreflightError::Malformed),
            Check::OverLimit => return Err(PreflightError::OverLimit),
          }
        }
        _ => {}
      }
    }
  }

  for _ in 0..shape.outputs {
    loop {
      let pair = cursor.pair().ok_or(PreflightError::Malformed)?;
      if pair.is_none() {
        break;
      }
    }
  }

  Ok(shape)
}

/// A key-value pair of a PSBT map.
struct Pair<'a> {
  key_type: u8,
  key_data: &'a [u8],
  value: &'a [u8],
}

/// A reader that checks every count and length against the bytes left
/// before skipping over them.
struct Cursor<'a> {
  bytes: &'a [u8],
  position: usize,
}

impl<'a> Cursor<'a> {
  fn new(bytes: &'a [u8]) -> Self {
    Self { bytes, position: 0 }
  }

  fn remaining(&self) -> usize {
    self.bytes.len() - self.position
  }

  fn take(&mut self, length: u64) -> Option<&'a [u8]> {
    let end = self.position.checked_add(usize::try_from(length).ok()?)?;
    let bytes = self.bytes.get(self.position..end)?;
    self.position = end;
    Some(bytes)
  }

  fn skip(&mut self, length: u64) -> Option<()> {
    self.take(length).map(drop)
  }

  /// A CompactSize, which rust-bitcoin requires to be minimally encoded.
  fn compact_size(&mut self) -> Option<u64> {
    let (width, minimum) = match *self.take(1)?.first()? {
      0xfd => (2, 0xfd),
      0xfe => (4, 0x1_0000),
      0xff => (8, 0x1_0000_0000),
      value => return Some(u64::from(value)),
    };
    let value = self
      .take(width)?
      .iter()
      .rev()
      .fold(0, |value, byte| (value << 8) | u64::from(*byte));
    (value >= minimum).then_some(value)
  }

  /// A count of items each at least `size` bytes long, which the remaining
  /// bytes must be able to hold.
  fn count(&mut self, size: u64) -> Option<u64> {
    let count = self.compact_size()?;
    (count <= self.remaining() as u64 / size).then_some(count)
  }

  fn witness(&mut self, max_items: Option<usize>) -> Result<(), PreflightError> {
    // Every item needs at least its length prefix.
    let count = self.count(1).ok_or(PreflightError::Malformed)?;
    if max_items.is_some_and(|max_items| count > max_items as u64) {
      return Err(PreflightError::OverLimit);
    }
    for _ in 0..count {
      let length = self.compact_size().ok_or(PreflightError::Malformed)?;
      self.skip(length).ok_or(PreflightError::Malformed)?;
    }
    Ok(())
  }

  fn inputs(&mut self) -> Option<u64> {
    // An input needs at least its 36-byte outpoint, a script length, and its
    // 4-byte sequence.
    let count = self.count(41)?;
    for _ in 0..count {
      self.skip(36)?;
      let length = self.compact_size()?;
      self.skip(length)?;
      self.skip(4)?;
    }
    Some(count)
  }

  fn outputs(&mut self) -> Option<u64> {
    // An output needs at least its 8-byte value and a script length.
    let count = self.count(9)?;
    for _ in 0..count {
      self.skip(8)?;
      let length = self.compact_size()?;
      self.skip(length)?;
    }
    Some(count)
  }

  /// A transaction, which rust-bitcoin reads in the BIP-144 witness
  /// serialization when the input count is zero.
  fn transaction(&mut self, max_items: Option<usize>) -> Result<(), PreflightError> {
    self.skip(4).ok_or(PreflightError::Malformed)?;
    if self.inputs().ok_or(PreflightError::Malformed)? == 0 {
      if self.take(1).ok_or(PreflightError::Malformed)? != [1] {
        return Err(PreflightError::Malformed);
      }
      let inputs = self.inputs().ok_or(PreflightError::Malformed)?;
      self.outputs().ok_or(PreflightError::Malformed)?;
      for _ in 0..inputs {
        self.witness(max_items)?;
      }
    } else {
      self.outputs().ok_or(PreflightError::Malformed)?;
    }
    self.skip(4).ok_or(PreflightError::Malformed)
  }

  /// A PSBT's unsigned transaction, which rust-bitcoin reads without the
  /// witness serialization, so zero inputs are just zero inputs.
  fn unsigned_transaction(&mut self) -> Option<PsbtShape> {
    self.skip(4)?;
    let inputs = self.inputs()?;
    let outputs = self.outputs()?;
    self.skip(4)?;
    Some(PsbtShape {
      inputs: usize::try_from(inputs).ok()?,
      outputs: usize::try_from(outputs).ok()?,
    })
  }

  /// The next pair of a map, or `None` at its separator.
  fn pair(&mut self) -> Option<Option<Pair<'a>>> {
    let key_length = self.compact_size()?;
    let Some((&key_type, key_data)) = self.take(key_length)?.split_first() else {
      return Some(None);
    };
    let value_length = self.compact_size()?;
    let value = self.take(value_length)?;
    Some(Some(Pair {
      key_type,
      key_data,
      value,
    }))
  }
}
