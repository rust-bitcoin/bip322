#[derive(Debug, PartialEq, Eq)]
pub enum Bip322Error {
  InvalidAddress, // for legacy addresses 1... (p2pkh) not supported, also any non taproot
  Invalid,        // Address no key; pubkey not recovered, invalid signature
  MalformedSignature, // wrong length, etc.
  InvalidSigHash, // only sighash All and Default supported
  NotKeyPathSpend, // only single key path spend supported
}
