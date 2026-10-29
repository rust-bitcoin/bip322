use super::*;

/// Maximum total inputs (challenge plus proven UTXOs) allowed in a Proof of
/// Funds. Verification bounds its work to this many inputs, so producers must
/// reject larger proofs rather than create proofs this crate cannot verify.
pub(crate) const MAX_PROOF_INPUTS: usize = 1024;

pub(crate) fn check_proof_input_count(proof_inputs: usize) -> Result<usize> {
  let count = proof_inputs
    .checked_add(1)
    .ok_or(Error::TooManyProofInputs {
      count: usize::MAX,
      max: MAX_PROOF_INPUTS,
    })?;
  if count > MAX_PROOF_INPUTS {
    return Err(Error::TooManyProofInputs {
      count,
      max: MAX_PROOF_INPUTS,
    });
  }
  Ok(count)
}

/// A bounds-checked reader for consensus encodings. It never allocates from a
/// length or count before checking that the bytes are present.
struct EncodingCursor<'a> {
  bytes: &'a [u8],
  position: usize,
}

impl<'a> EncodingCursor<'a> {
  fn new(bytes: &'a [u8]) -> Self {
    Self { bytes, position: 0 }
  }

  fn remaining(&self) -> usize {
    self.bytes.len().saturating_sub(self.position)
  }

  fn take(&mut self, length: u64) -> Option<&'a [u8]> {
    let length = usize::try_from(length).ok()?;
    let end = self.position.checked_add(length)?;
    let bytes = self.bytes.get(self.position..end)?;
    self.position = end;
    Some(bytes)
  }

  fn skip(&mut self, length: u64) -> bool {
    self.take(length).is_some()
  }

  fn compact_size(&mut self) -> Option<u64> {
    let first = *self.take(1)?.first()?;
    let (width, minimum) = match first {
      0xfd => (2, 0xfd),
      0xfe => (4, 0x1_0000),
      0xff => (8, 0x1_0000_0000),
      value => return Some(u64::from(value)),
    };
    let raw = self.take(width)?;
    let mut value = 0u64;
    for byte in raw.iter().rev() {
      value = (value << 8) | u64::from(*byte);
    }
    (value >= minimum).then_some(value)
  }

  fn witness(&mut self) -> bool {
    let Some(count) = self.compact_size() else {
      return false;
    };
    // Every witness item needs at least its length prefix.
    if count > self.remaining() as u64 {
      return false;
    }
    for _ in 0..count {
      let Some(length) = self.compact_size() else {
        return false;
      };
      if !self.skip(length) {
        return false;
      }
    }
    true
  }

  fn inputs(&mut self, count: u64) -> bool {
    // A TxIn needs at least 36 bytes of outpoint, one length byte, and four
    // bytes of sequence.
    if count > self.remaining() as u64 / 41 {
      return false;
    }
    for _ in 0..count {
      let Some(length) = self.compact_size_after(36) else {
        return false;
      };
      if !self.skip(length) || !self.skip(4) {
        return false;
      }
    }
    true
  }

  fn compact_size_after(&mut self, prefix: u64) -> Option<u64> {
    if !self.skip(prefix) {
      return None;
    }
    self.compact_size()
  }

  fn outputs(&mut self, count: u64) -> bool {
    // A TxOut needs at least eight value bytes and one length byte.
    if count > self.remaining() as u64 / 9 {
      return false;
    }
    for _ in 0..count {
      let Some(length) = self.compact_size_after(8) else {
        return false;
      };
      if !self.skip(length) {
        return false;
      }
    }
    true
  }

  fn pair(&mut self) -> Option<Option<RawPair<'a>>> {
    let key_length = self.compact_size()?;
    if key_length == 0 {
      return Some(None);
    }
    let key = self.take(key_length)?;
    let value_length = self.compact_size()?;
    let value = self.take(value_length)?;
    Some(Some(RawPair {
      key_type: key[0],
      key_data: &key[1..],
      value,
    }))
  }
}

struct RawPair<'a> {
  key_type: u8,
  key_data: &'a [u8],
  value: &'a [u8],
}

/// Checks CompactSize counts and lengths before rust-bitcoin allocates from
/// attacker-controlled values. Every witness item needs at least its length
/// prefix, so a count larger than the remaining byte count is impossible.
pub(crate) fn valid_witness_encoding(bytes: &[u8]) -> bool {
  EncodingCursor::new(bytes).witness()
}

fn parse_transaction_shape(bytes: &[u8]) -> Option<(usize, usize)> {
  let mut cursor = EncodingCursor::new(bytes);
  cursor.skip(4).then_some(())?;

  let input_count = cursor.compact_size()?;
  let (input_count, output_count) = if input_count == 0 {
    if cursor.take(1)?.first() != Some(&1) {
      return None;
    }
    let input_count = cursor.compact_size()?;
    if !cursor.inputs(input_count) {
      return None;
    }
    let output_count = cursor.compact_size()?;
    if !cursor.outputs(output_count) {
      return None;
    }
    for _ in 0..input_count {
      if !cursor.witness() {
        return None;
      }
    }
    (input_count, output_count)
  } else {
    if !cursor.inputs(input_count) {
      return None;
    }
    let output_count = cursor.compact_size()?;
    if !cursor.outputs(output_count) {
      return None;
    }
    (input_count, output_count)
  };

  cursor.skip(4).then_some(())?;
  Some((
    usize::try_from(input_count).ok()?,
    usize::try_from(output_count).ok()?,
  ))
}

pub(crate) fn valid_transaction_encoding(bytes: &[u8]) -> bool {
  parse_transaction_shape(bytes).is_some()
}

pub(crate) fn valid_psbt_encoding(bytes: &[u8]) -> bool {
  let mut cursor = EncodingCursor::new(bytes);
  if cursor.take(5) != Some(b"psbt\xff".as_slice()) {
    return false;
  }

  let mut unsigned_tx_shape = None;
  loop {
    let Some(pair) = cursor.pair() else {
      return false;
    };
    let Some(pair) = pair else {
      break;
    };
    if pair.key_type == 0x00 && pair.key_data.is_empty() {
      if unsigned_tx_shape.is_some() || !valid_transaction_encoding(pair.value) {
        return false;
      }
      unsigned_tx_shape = parse_transaction_shape(pair.value);
    }
  }

  let Some((input_count, output_count)) = unsigned_tx_shape else {
    return false;
  };

  for _ in 0..input_count {
    loop {
      let Some(pair) = cursor.pair() else {
        return false;
      };
      let Some(pair) = pair else {
        break;
      };
      if pair.key_data.is_empty() && pair.key_type == 0x00 {
        if !valid_transaction_encoding(pair.value) {
          return false;
        }
      } else if pair.key_data.is_empty()
        && pair.key_type == 0x08
        && !valid_witness_encoding(pair.value)
      {
        return false;
      }
    }
  }

  for _ in 0..output_count {
    loop {
      let Some(pair) = cursor.pair() else {
        return false;
      };
      if pair.is_none() {
        break;
      }
    }
  }

  true
}
