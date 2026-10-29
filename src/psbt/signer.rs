use super::*;

/// Confirms the PSBT is a BIP-322 request via [`detect_bip322_psbt`], then
/// signs `input_index`, adding a partial signature for ECDSA scripts or
/// `tap_key_sig` for taproot. Does not finalize.
///
/// Input 0 is the message challenge; later inputs are proof-of-funds UTXOs
/// and are signed against their own previous output.
///
/// Returns the detected message and challenge, which integrators must
/// display to the user as message signing, not transaction signing.
pub fn sign_bip322_psbt_input(
  psbt: &mut Psbt,
  private_key: &PrivateKey,
  input_index: usize,
) -> Result<Bip322Psbt> {
  let Some(detected) = detect_bip322_psbt(psbt) else {
    return Err(Error::OrdinaryPsbt);
  };

  validate_psbt_structure(psbt)?;
  if input_index >= psbt.unsigned_tx.input.len() {
    return Err(Error::ToSignInvalid);
  }

  let secp = Secp256k1::new();
  let pub_key = private_key.public_key(&secp);

  // Taproot sighashes commit to every prevout, so resolve them all.
  let resolver = PrevoutResolver::new(psbt)?;
  let mut prevouts = Vec::with_capacity(psbt.inputs.len());
  for index in 0..psbt.inputs.len() {
    prevouts.push(checked_psbt_input_prevout(psbt, &resolver, index)?);
  }

  // Input 0 is bound to the challenge; a proof input to its own prevout.
  let challenge = if input_index == 0 {
    detected.message_challenge.clone()
  } else {
    prevouts[input_index].script_pubkey.clone()
  };

  let challenge = &challenge;
  let value = prevouts[input_index].value;

  if challenge.is_p2tr() {
    let sighash_type = signing_taproot_sighash(&psbt.inputs[input_index])?;
    let key_pair = Keypair::from_secret_key(&secp, &private_key.inner);
    let (x_only_public_key, _parity) = XOnlyPublicKey::from_keypair(&key_pair);

    let sighash = SighashCache::new(psbt.unsigned_tx.clone())
      .taproot_key_spend_signature_hash(
        input_index,
        &sighash::Prevouts::All(&prevouts),
        sighash_type,
      )
      .expect("signature hash should compute");

    let key_pair = key_pair
      .tap_tweak(&secp, psbt.inputs[input_index].tap_merkle_root)
      .to_keypair();

    let (output_key, _parity) = XOnlyPublicKey::from_keypair(&key_pair);
    if *challenge != ScriptBuf::new_p2tr_tweaked(output_key.dangerous_assume_tweaked()) {
      return Err(Error::PublicKeyMismatch);
    }

    psbt.inputs[input_index].tap_internal_key = Some(x_only_public_key);

    let signature = secp.sign_schnorr_no_aux_rand(
      &secp256k1::Message::from_digest_slice(sighash.as_ref())
        .expect("should be cryptographically secure hash"),
      &key_pair,
    );

    psbt.inputs[input_index].tap_key_sig = Some(bitcoin::taproot::Signature {
      signature,
      sighash_type,
    });

    return Ok(detected);
  }

  let sighash_type = declared_ecdsa_sighash(&psbt.inputs[input_index])?;

  let message = if challenge.is_p2wpkh() {
    if *challenge
      != ScriptBuf::new_p2wpkh(
        &pub_key
          .wpubkey_hash()
          .context(error::UncompressedPublicKey)?,
      )
    {
      return Err(Error::PublicKeyMismatch);
    }

    let sighash = SighashCache::new(psbt.unsigned_tx.clone())
      .p2wpkh_signature_hash(input_index, challenge, value, sighash_type)
      .expect("signature hash should compute");
    secp256k1::Message::from_digest_slice(sighash.as_ref())
      .expect("should be cryptographically secure hash")
  } else if challenge.is_p2pkh() {
    if *challenge != ScriptBuf::new_p2pkh(&pub_key.pubkey_hash()) {
      return Err(Error::PublicKeyMismatch);
    }
    let sighash = SighashCache::new(psbt.unsigned_tx.clone())
      .legacy_signature_hash(input_index, challenge, sighash_type.to_u32())
      .expect("signature hash should compute");
    secp256k1::Message::from_digest_slice(sighash.as_ref())
      .expect("should be cryptographically secure hash")
  } else if challenge.is_p2sh()
    && psbt.inputs[input_index].witness_script.is_none()
    && psbt.inputs[input_index]
      .redeem_script
      .as_ref()
      .map_or(true, |redeem| redeem.is_p2wpkh())
  {
    let wpkh = pub_key
      .wpubkey_hash()
      .context(error::UncompressedPublicKey)?;
    let redeem = ScriptBuf::new_p2wpkh(&wpkh);
    if *challenge != ScriptBuf::new_p2sh(&redeem.script_hash())
      || psbt.inputs[input_index]
        .redeem_script
        .as_ref()
        .is_some_and(|supplied| *supplied != redeem)
    {
      return Err(Error::PublicKeyMismatch);
    }
    psbt.inputs[input_index].redeem_script = Some(redeem.clone());
    let sighash = SighashCache::new(psbt.unsigned_tx.clone())
      .p2wpkh_signature_hash(input_index, &redeem, value, sighash_type)
      .expect("signature hash should compute");
    secp256k1::Message::from_digest_slice(sighash.as_ref())
      .expect("should be cryptographically secure hash")
  } else {
    let (script, is_witness) = match (
      &psbt.inputs[input_index].witness_script,
      &psbt.inputs[input_index].redeem_script,
    ) {
      (Some(witness_script), _) => (witness_script.clone(), true),
      (None, Some(redeem_script)) => (redeem_script.clone(), false),
      (None, None) => {
        return Err(Error::UnsupportedAddress {
          address: challenge.to_string(),
        })
      }
    };

    let (_, pubkeys) = parse_multisig(&script)?;
    if !pubkeys.contains(&pub_key) {
      return Err(Error::UnknownSigner);
    }

    require_multisig_challenge(
      &script,
      challenge,
      is_witness,
      psbt.inputs[input_index].redeem_script.as_ref(),
    )?;

    let sighash = if is_witness {
      SighashCache::new(psbt.unsigned_tx.clone())
        .p2wsh_signature_hash(input_index, &script, value, sighash_type)
        .expect("signature hash should compute")
        .to_byte_array()
    } else {
      SighashCache::new(psbt.unsigned_tx.clone())
        .legacy_signature_hash(input_index, &script, sighash_type.to_u32())
        .expect("signature hash should compute")
        .to_byte_array()
    };
    secp256k1::Message::from_digest_slice(&sighash)
      .expect("should be cryptographically secure hash")
  };

  let signature = secp.sign_ecdsa(&message, &private_key.inner);

  psbt.inputs[input_index].partial_sigs.insert(
    pub_key,
    bitcoin::ecdsa::Signature {
      signature,
      sighash_type,
    },
  );

  Ok(detected)
}
