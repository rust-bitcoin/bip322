import { Buff, Bytes }    from '@cmdcode/buff-utils'
import { _0n }            from './const.js'
import { Field, Point }   from './ecc.js'
import { get_shared_key } from './ecdh.js'
import { digest }         from './hash.js'

import { get_pubkey, convert_32 }   from './keys.js'
import { sign_config, SignOptions } from './config.js'

import * as assert from './assert.js'

export function sign (
  message  : Bytes,
  secret   : Bytes,
  options ?: SignOptions
) : Buff {
  /**
   * Implementation of signature algorithm as specified in BIP0340.
   * https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki
   */
  const opt = sign_config(options)
  const { adaptor, tweak, xonly } = opt

  // Normalize our message into bytes.
  const m = Buff.bytes(message)
  // Let d' equal the integer value of secret key.
  let dp = Field.mod(secret)
  // If there is a tweak involved, apply it.
  if (tweak !== undefined) {
    // If xonly, we have to negate here.
    if (xonly) dp = dp.negated
    // Apply the tweak.
    dp = dp.add(tweak)
  }
  // Let P equal d' * G
  const P = dp.point
  // Let d equal d' (negate if needed).
  const d = (xonly) ? dp.negated : dp
  // Compute our nonce value.
  const n = gen_nonce(m, d, opt)
  // Let k' equal our nonce mod N.
  let kp = Field.mod(n)
  // If adaptor present, apply to k'.
  if (adaptor !== undefined) {
    // If xonly, we have to negate here.
    if (xonly) kp = kp.negated
    // Apply the tweak.
    kp = kp.add(adaptor)
  }
  // Let R equal k' * G.
  const R = kp.point
  // For taproot: If R has an odd Y coordinate, return negated version of k'.
  const k = (xonly) ? kp.negated.big : kp.big
  // Let c equal the tagged hash('BIP0340/challenge' || R || P || m) mod n.
  const ch = digest('BIP0340/challenge', R.x.raw, P.x.raw, m)
  const c  = Field.mod(ch)
  // Let s equal (k + ed) mod n.
  const s  = Field.mod(k + (c.big * d.big))
  // Convert R if xonly.
  const rx = (xonly) ? R.x.raw : R.raw
  // Return (R || s) as a signature
  return Buff.join([ rx, s.raw ])
}

export function verify (
  signature : Bytes,
  message   : Bytes,
  pubkey    : Bytes,
  options  ?: SignOptions
) : boolean {
   /**
   * Implementation of verify algorithm as specified in BIP0340.
   * https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki
   */
  const { throws } = sign_config(options)
  // Normalize the message into bytes.
  const msg = Buff.bytes(message)
  // Convert signature into a stream object.
  const sig = Buff.bytes(signature)
  // Check if the signature size is at least 64 bytes.
  if (sig.length < 64) {
    return assert.fail('Signature length is too small: ' + String(sig.length), throws)
  }
  // Assert that the pubkey is 32 bytes.
  assert.size(pubkey, 32)
  // Lift the pubkey to point P.
  const P  = Point.from_x(pubkey)
  // Let rx equal first 32 bytes of signature.
  const rx = sig.subarray(0, 32)
  // Lift rx to point R.
  const R  = Point.from_x(rx)
  // Let s equal next 32 bytes of signature.
  const s  = sig.subarray(32, 64)
  // Lift s to point sG.
  const sG = Field.mod(s).point
  // Let the challenge equal hash('BIP0340/challenge' || R || P || m).
  const ch = digest('BIP0340/challenge', R.x, P.x, msg)
  // Let c equal the field value of challenge mod N.
  const c  = Field.mod(ch)
  // Let eP equal point P * c
  const eP = P.mul(c.big)
  // Let r = sG - eP.
  const r  = sG.sub(eP)

  // Reject if R value has an odd Y coordinate.
  if (R.hasOddY) {
    return assert.fail('Signature R value has odd Y coordinate!', throws)
  }

  // Reject if R value is infinite.
  if (R.x.big === _0n) {
    return assert.fail('Signature R value is infinite!', throws)
  }

  // Reject if x coordinate of R value does not equal r.
  if (R.x.big !== r.x.big) {
    return assert.fail(`Signature is invalid! R: ${R.x.hex} r:${r.x.hex}`, throws)
  }

  return R.x.big === r.x.big
}

export function recover (
  signature : Bytes,
  message   : Bytes,
  pub_key   : Bytes,
  rec_key   : Bytes
) : Buff {
  const sig   = Buff.bytes(signature)
  const msg   = Buff.bytes(message)
  const pub   = Buff.bytes(pub_key)
  const seed  = get_shared_key(rec_key, pub_key)
  const nonce = digest('BIP0340/nonce', seed, message)
  const chal  = digest('BIP0340/challenge', sig.slice(0, 32), convert_32(pub), msg)
  const c = new Field(chal)
  const k = new Field(nonce).negated
  const s = new Field(sig.slice(32, 64))
  return s.sub(k).div(c).buff
}

export function gen_nonce (
  message  : Bytes,
  secret   : Bytes,
  options ?: SignOptions
) : Buff {
  const { aux, nonce, nonce_tweaks = [], recovery, xonly } = sign_config(options)
  let n : Buff
  if (nonce !== undefined) {
    n = Buff.bytes(nonce)
  } else if (recovery !== undefined) {
    n = get_shared_key(secret, recovery)
  } else {
    const seed = (aux === null) ? Buff.num(0, 32) : aux
    // Hash the auxiliary data according to BIP 0340.
    const a = digest('BIP0340/aux', seed ?? Buff.random(32))
    // Let t equal the byte-wise xor of (d) and (a).
    const t = Buff.bytes(secret).big ^ a.big
    // The nonce seed is our xor secret key and public key.
    n = Buff.join([ t, get_pubkey(secret, xonly) ])
  }
  // Compute our nonce as a tagged hash of the seed value and message.
  let sn = Field.mod(digest('BIP0340/nonce', n, Buff.bytes(message)))
  // Apply any internal tweaks that are specified.
  nonce_tweaks.forEach(e => { sn = sn.add(e).negated })
  return sn.buff
}
