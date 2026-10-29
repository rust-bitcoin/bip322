use {
  base64::{engine::general_purpose, Engine},
  bitcoin::{
    absolute::LockTime,
    address::AddressData,
    consensus::Decodable,
    consensus::Encodable,
    hashes::Hash,
    key::{Keypair, TapTweak},
    opcodes,
    psbt::Psbt,
    script::{Instruction, PushBytes, PushBytesBuf},
    secp256k1::{self, schnorr::Signature, Message, Secp256k1, XOnlyPublicKey},
    sighash::{self, SighashCache, TapSighashType},
    sign_message::{signed_msg_hash, MessageSignature},
    transaction::Version,
    Address, Amount, EcdsaSighashType, OutPoint, PrivateKey, PublicKey, Script, ScriptBuf,
    Sequence, Transaction, TxIn, TxOut, Witness,
  },
  sha2::{Digest, Sha256},
  snafu::{ResultExt, Snafu},
  std::str::FromStr,
};

mod error;
mod limits;
mod message;
mod psbt;
mod script;
mod sign;
mod transaction;
mod verify;

pub use {error::Error, message::*, psbt::*, sign::*, verify::*};
pub(crate) use {limits::*, script::*, transaction::*};

type Result<T = (), E = Error> = std::result::Result<T, E>;

#[cfg(test)]
mod tests;
