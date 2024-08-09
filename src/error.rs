#[derive(Debug)]
pub enum Bip322Error {
  Legacy, // for legacy addresses 1... (p2pkh) not supported
  InvalidAddress,
  Invalid,            // Address no key; pubkey not recovered;
  MalformedSignature, // wrong length
  NotSigned,
  InvalidSigHash,  // only sighash All and Default supported
  ScriptSpendP2TR, // only single key path spend supported
}
