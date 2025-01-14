import { Buff, Bytes }  from '@cmdcode/buff-utils'
import { Field, Point } from './ecc.js'
import { random }       from './util.js'

export function is_even_pub (pubkey : Bytes) : boolean {
  const pub = Buff.bytes(pubkey)
  switch (true) {
    case (pub.length === 32):
      return true
    case (pub.length === 33 && pub[0] === 0x02):
      return true
    case (pub.length === 33 && pub[0] === 0x03):
      return false
    default:
      throw new TypeError(`Invalid public key: ${pub.hex}`)
  }
}

export function gen_seckey (
  even_y ?: boolean
) : Buff {
  return get_seckey(random(32), even_y)
}

export function get_seckey (
  secret : Bytes,
  even_y = false
) : Buff {
  const sec = Field.mod(secret)
  return (even_y) ? sec.negated.buff : sec.buff
}

export function get_pubkey (
  seckey : Bytes,
  x_only = false
) : Buff {
  const p = Field.mod(seckey).point
  return (x_only) ? p.x : p.buff
}

export function tweak_seckey (
  seckey : Bytes,
  tweaks : Bytes[] = [],
  even_y = false
) : Buff {
  let sec = Field.mod(seckey)
  for (const twk of tweaks) {
    sec = sec.add(twk)
    if (even_y) sec = sec.negated
  }
  return sec.buff
}

export function tweak_pubkey (
  pubkey : Bytes,
  tweaks : Bytes[] = [],
  x_only = false
) : Buff {
  let pub = Point.from_x(pubkey, x_only)
  for (const twk of tweaks) {
    pub = pub.add(twk)
    if (x_only) pub = pub.negated
  }
  return (x_only) ? pub.x : pub.buff
}

export function negate_seckey (
  seckey : Bytes,
  negate : boolean
) : Buff {
  const s = Field.mod(seckey)
  return (negate) ? s.negate().buff : s.buff
}

export function get_keypair (
  secret  : Bytes,
  x_only ?: boolean,
  even_y ?: boolean
) : [ Buff, Buff ] {
  const sec = get_seckey(secret, even_y)
  const pub = get_pubkey(sec, x_only)
  return [ sec, pub ]
}

export function gen_keypair (
  x_only ?: boolean,
  even_y ?: boolean
) : [ Buff, Buff ] {
  const sec = random(32)
  return get_keypair(sec, x_only, even_y)
}

export function convert_32 (pubkey : Bytes) : Buff {
  const key = Buff.bytes(pubkey)
  if (key.length === 32) return key
  if (key.length === 33) return key.slice(1, 33)
  throw new TypeError(`Invalid key length: ${key.length}`)
}

export function convert_33 (
  pubkey : Bytes,
  even_y = false
) : Buff {
  const key = Buff.bytes(pubkey)
  if (key.length === 32) {
    return key.prepend(0x02)
  } else if (key.length === 33) {
    if (even_y) key[0] = 0x02
    return key
  }
  throw new TypeError(`Invalid key size: ${key.length}`)
}
