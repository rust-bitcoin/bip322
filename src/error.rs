use super::*;

#[derive(Debug, Snafu)]
#[snafu(context(suffix(false)), visibility(pub))]
pub enum Error {
  #[snafu(display("Failed to parse address `{address}`"))]
  AddressParse {
    source: bitcoin::address::ParseError,
    address: String,
  },
  #[snafu(display("Failed to parse private key"))]
  PrivateKeyParse { source: bitcoin::key::FromWifError },
  #[snafu(display("Unsupported address `{address}`, only P2TR, P2WPKH, P2SH-P2WPKH, P2PKH, and P2WSH/P2SH multisig allowed"))]
  UnsupportedAddress { address: String },
  #[snafu(display("Decode error for signature `{signature}`"))]
  SignatureDecode {
    source: base64::DecodeError,
    signature: String,
  },
  #[snafu(display("Transaction encode error"))]
  TransactionEncode { source: bitcoin::io::Error },
  #[snafu(display("Transaction extract error"))]
  TransactionExtract {
    source: bitcoin::psbt::ExtractTxError,
  },
  #[snafu(display("To sign transaction invalid"))]
  ToSignInvalid,
  #[snafu(display("PSBT extract error"))]
  PsbtExtract { source: bitcoin::psbt::Error },
  #[snafu(display("Base64 decode error for transaction `{transaction}`"))]
  TransactionBase64Decode {
    source: base64::DecodeError,
    transaction: String,
  },
  #[snafu(display("Consensus decode error for transaction `{transaction}`"))]
  TransactionConsensusDecode {
    source: bitcoin::consensus::encode::Error,
    transaction: String,
  },
  #[snafu(display("Witness malformed"))]
  WitnessMalformed {
    source: bitcoin::consensus::encode::Error,
  },
  #[snafu(display("Witness empty"))]
  WitnessEmpty,
  #[snafu(display("Encode witness error"))]
  WitnessEncoding { source: bitcoin::io::Error },
  #[snafu(display("Signature of wrong length `{length}`"))]
  SignatureLength {
    length: usize,
    encoded_signature: Vec<u8>,
  },
  #[snafu(display("Invalid signature"))]
  SignatureInvalid { source: bitcoin::secp256k1::Error },
  #[snafu(display("Invalid sighash"))]
  SigHashTypeInvalid {
    source: bitcoin::sighash::InvalidSighashTypeError,
  },
  #[snafu(display("Non-standard sighash type: {source}"))]
  SigHashTypeNonStandard {
    source: bitcoin::sighash::NonStandardSighashTypeError,
  },
  #[snafu(display("Unsupported sighash type `{sighash_type}`"))]
  SigHashTypeUnsupported { sighash_type: String },
  #[snafu(display("Not key path spend"))]
  NotKeyPathSpend,
  #[snafu(display("Invalid public key"))]
  InvalidPublicKey,
  #[snafu(display("Invalid witness"))]
  InvalidWitness,
  #[snafu(display("Public key does not match"))]
  PublicKeyMismatch,
  #[snafu(display("At least one private key is required"))]
  NoPrivateKeys,
  #[snafu(display("At least one proof input is required"))]
  NoProofInputs,
  #[snafu(display("Signer's public key not present in multisig script"))]
  UnknownSigner,
  #[snafu(display("Duplicate private key provided"))]
  DuplicateSigner,
  #[snafu(display("Expected exactly {required} private keys, got {provided}"))]
  SignatureCount { required: usize, provided: usize },
  #[snafu(display("P2WPKH requires a compressed public key"))]
  UncompressedPublicKey {
    source: bitcoin::key::UncompressedPublicKeyError,
  },
  #[snafu(display("Failed to parse witness script"))]
  WitnessScriptParse {
    source: bitcoin::hex::HexToBytesError,
  },
  #[snafu(display("Invalid BIP-137 recovery flag `{flag}`"))]
  InvalidRecoveryFlag { flag: u8 },
  #[snafu(display("Invalid legacy signature: {source}"))]
  LegacyRecover {
    source: bitcoin::sign_message::MessageSignatureError,
  },
  #[snafu(display("Invalid proof input at index {index}: {reason}"))]
  InvalidProofInput { index: usize, reason: String },
}
