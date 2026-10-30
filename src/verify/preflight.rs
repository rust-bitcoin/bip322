//! Bounds checks on attacker-supplied encodings, run before rust-bitcoin
//! decodes them.
//!
//! rust-bitcoin allocates from CompactSize counts and lengths before reading
//! the data they describe, so every count and length is first checked against
//! the bytes actually present. These checks never allocate, and they accept
//! every encoding rust-bitcoin decodes, reporting the same shape.

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

/// Checks a consensus-encoded witness.
pub(crate) fn witness(bytes: &[u8]) -> bool {
  Cursor::new(bytes).witness().is_some()
}

/// Checks a consensus-encoded transaction.
pub(crate) fn transaction(bytes: &[u8]) -> bool {
  Cursor::new(bytes).transaction().is_some()
}

/// Checks a PSBT and returns the shape of its unsigned transaction.
pub(crate) fn psbt(bytes: &[u8]) -> Option<PsbtShape> {
  let mut cursor = Cursor::new(bytes);
  if cursor.take(5)? != b"psbt\xff" {
    return None;
  }

  let mut shape = None;
  while let Some(pair) = cursor.pair()? {
    if pair.key_type == PSBT_GLOBAL_UNSIGNED_TX && pair.key_data.is_empty() {
      // rust-bitcoin rejects a second unsigned transaction.
      if shape.is_some() {
        return None;
      }
      let mut unsigned_tx = Cursor::new(pair.value);
      shape = Some(unsigned_tx.unsigned_transaction()?);
      if unsigned_tx.remaining() != 0 {
        return None;
      }
    }
  }
  let shape = shape?;

  for _ in 0..shape.inputs {
    while let Some(pair) = cursor.pair()? {
      if !pair.key_data.is_empty() {
        continue;
      }
      let valid = match pair.key_type {
        PSBT_IN_NON_WITNESS_UTXO => {
          pair.value.len() <= MAX_ENCODING_SIZE && transaction(pair.value)
        }
        PSBT_IN_FINAL_SCRIPTWITNESS => pair.value.len() <= MAX_ENCODING_SIZE && witness(pair.value),
        _ => true,
      };
      if !valid {
        return None;
      }
    }
  }

  for _ in 0..shape.outputs {
    while cursor.pair()?.is_some() {}
  }

  Some(shape)
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

  fn witness(&mut self) -> Option<()> {
    // Every item needs at least its length prefix.
    for _ in 0..self.count(1)? {
      let length = self.compact_size()?;
      self.skip(length)?;
    }
    Some(())
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
  fn transaction(&mut self) -> Option<()> {
    self.skip(4)?;
    if self.inputs()? == 0 {
      if self.take(1)? != [1] {
        return None;
      }
      let inputs = self.inputs()?;
      self.outputs()?;
      for _ in 0..inputs {
        self.witness()?;
      }
    } else {
      self.outputs()?;
    }
    self.skip(4)
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
