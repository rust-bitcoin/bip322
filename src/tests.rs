use {super::*, bitcoin::hashes::sha256, rand::RngCore};

mod codeseparator;
mod encoding;
mod fixtures;
mod interpreter;
mod legacy;
mod p2sh;
mod pof;
mod psbt;
mod signing;
mod taproot;
mod vectors;
mod verification;
