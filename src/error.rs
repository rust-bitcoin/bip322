use super::*;

#[derive(Debug, Snafu, PartialEq)]
#[snafu(context(suffix(false)), visibility(pub))]
pub enum Error {
  #[snafu(display("Failed to parse address `{address}`"))]
  AddressParse {
    source: bitcoin::address::ParseError,
    address: String,
  },
  #[snafu(display("Invalid address"))]
  InvalidAddress,
  #[snafu(display("Invalid"))]
  Invalid,
  #[snafu(display("Malformed signature `{signature}`"))]
  SignatureDecode {
    source: base64::DecodeError,
    signature: String,
  },
  #[snafu(display("Malformed signature"))]
  MalformedSignature,
  #[snafu(display("Invalid sighash"))]
  InvalidSigHash,
  #[snafu(display("Not key path spend"))]
  NotKeyPathSpend,
}
