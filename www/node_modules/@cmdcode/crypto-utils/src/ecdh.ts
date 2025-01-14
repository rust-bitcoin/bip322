import { Buff, Bytes }  from '@cmdcode/buff-utils'
import { Field, Point } from './ecc.js'

import { taghash, hmac512 }       from './hash.js'
import { get_seckey, get_pubkey } from './keys.js'

export function get_shared_key (
  self_sec : Bytes,
  peer_pub : Bytes
) : Buff {
  const P  = Point.from_x(peer_pub)
  const sp = Field.mod(self_sec)
  const sh = P.mul(sp)
  return sh.buff
}

export function get_shared_code (
  self_sec : Bytes,
  peer_pub : Bytes,
  message  : Bytes,
  prefix   = 'ecdh/hmac512'
) : Buff {
  const sec  = get_seckey(self_sec)
  const pub  = get_pubkey(sec)
  const peer = Buff.bytes(peer_pub)
  const tag  = taghash(prefix)
  // Derive a shared key.
  const shared = get_shared_key(sec, peer_pub)
  // Sort the pub keys lexographically.
  const pubs = [ pub.hex, peer.hex ].sort()
  // Use the shared key to sign a SHA512 digest.
  return hmac512(shared, Buff.join([ ...tag, ...pubs, message ]))
}
