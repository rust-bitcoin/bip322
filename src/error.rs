use super::*;

#[derive(Debug, Snafu)]
#[snafu(context(suffix(false)), visibility(pub))]
pub enum Error {
  #[snafu(display("Failed to parse address `{address}`"))]
  AddressParse {
    source: bitcoin::address::ParseError,
    address: String,
  },
  #[snafu(display("Unsuported address `{address}`, only P2TR allowed"))]
  UnsupportedAddress { address: String },
  #[snafu(display("Invalid"))]
  Invalid,
  #[snafu(display("Decode error for signature `{signature}`"))]
  SignatureDecode {
    source: base64::DecodeError,
    signature: String,
  },
  #[snafu(display("Base64 decode error for transaction `{transaction}`"))]
  TransactionDecode {
    source: base64::DecodeError,
    transaction: String,
  },
  #[snafu(display("Consensu decode error for transaction `{transaction}`"))]
  TransactionConsensusDecode {
    source: bitcoin::consensus::encode::Error,
    transaction: String,
  },
  #[snafu(display("Witness signature"))]
  MalformedWitness {
    source: bitcoin::consensus::encode::Error,
  },
  #[snafu(display("Signature of wrong length `{length}`"))]
  SignatureLength {
    length: usize,
    encoded_signature: Vec<u8>,
  },
  #[snafu(display("Invalid signature because: `{}`", source.to_string()))]
  InvalidSignature {
    source: bitcoin::secp256k1::Error,
  },
  #[snafu(display("Invalid sighash"))]
  InvalidSigHash {
    source: bitcoin::sighash::InvalidSighashTypeError,
  },
  #[snafu(display("Unsupported sighash type `{sighash_type}`"))]
  UnsupportedSigHash { sighash_type: String },
  #[snafu(display("Not key path spend"))]
  NotKeyPathSpend,
}
