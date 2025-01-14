import { Buff, Bytes }   from '@cmdcode/buff-utils'
import { Field, Point }  from './ecc.js'
import { get_pubkey }    from './keys.js'
import { HDKey, ExtKey } from './types.js'

import { hash160, hmac512 } from './hash.js'

import * as assert from './assert.js'

type Tweak = [ tweak: Buff, is_hardened: boolean ]

const INT_REGEX = /^[0-9]{0,10}$/,
      STR_REGEX = /^[0-9a-zA-Z_&?=]{64}$/

export function derive (
  path        : string,
  input_key   : Bytes,
  chain_code ?: Bytes,
  is_private  = false
) : HDKey {
  // Assert no conflicts between path and chain.
  assert.valid_chain(path, chain_code)
  // Prepare the input key.
  const key = Buff.bytes(input_key)
  // Prepare the chain code.
  let code = (chain_code !== undefined)
    ? Buff.bytes(chain_code)
    : Buff.str('Bitcoin seed')
  // Init our keypair variables.
  let prev   : Buff | null = null,
      seckey : Buff | null = null,
      pubkey : Buff
  // If this is a master path:
  if (path.startsWith('m')) {
    // Generate the root.
    const root = generate_code(code, key)
    code   = root[1]
    seckey = root[0]
    pubkey = get_pubkey(seckey, false)
  } else if (is_private) {
    // Set seckey and pubkey.
    assert.size(input_key, 32)
    seckey = key
    pubkey = get_pubkey(seckey, false)
  } else {
    // Set just the pubkey.
    assert.size(key, 33)
    pubkey = key
  }
  // Derive paths for key tweaking.
  const tweaks = parse_tweaks(path)
  // For each path segment:
  for (const [ tweak, is_hardened ] of tweaks) {
    // Format our bytes based on path state.
    const bytes = (is_hardened && seckey !== null)
      ? Buff.join([ 0x00, seckey, tweak ])
      : Buff.join([ pubkey, tweak ])
    // Compute the next chaincode iteration.
    const [ next_key, next_code ] = generate_code(code, bytes)
    // Set the current code to the new value.
    code = Buff.raw(next_code)
    // Store the current pubkey as prev value.
    prev = pubkey
    // Check if we are working with a secret key:
    if (seckey !== null) {
      // Update the keypair with the added tweak.
      seckey = Field.mod(seckey).add(next_key).buff
      pubkey = get_pubkey(seckey, false)
      assert.in_field(seckey.big, true)
    } else {
      // Update the pubkey with the added tweak.
      pubkey = Point.from_x(pubkey).add(next_key).buff
      assert.on_curve(pubkey.slice(1).big, true)
    }
  }

  return { seckey, pubkey, code, path, prev }
}

export function parse_tweaks (
  keypath : string
) : Tweak[] {
  // Assert the key path is valid.
  assert.valid_path(keypath)
  const tweaks : Tweak[] = []

  let paths = keypath.split('/')

  if (paths[0] === 'm' || paths[0] === '') {
    paths = paths.slice(1)
  }

  for (let path of paths) {
      let is_hardened = false

    if (path.slice(-1) === '\'') {
      is_hardened = true
      path = path.slice(0, -1)
    }

    if (path.match(INT_REGEX) !== null) {
      let index = parseInt(path, 10)
      assert.valid_index(index)
      if (is_hardened) index += 0x80000000
      tweaks.push([ Buff.num(index, 4), is_hardened ])
    } else if (path.match(STR_REGEX) !== null) {
      let index = Buff.str(path)
      if (is_hardened) index = index.prepend(0x80)
      tweaks.push([ index.digest, is_hardened ])
    } else {
      throw new Error('Invalid path segment:' + path)
    }
  }

  return tweaks
}

export function generate_code (
  chain : Bytes,
  data  : Bytes
) : Buff[] {
  /* Perform an HMAC-512 operation on the provided key. */
  const I  = hmac512(chain, data),
        IL = I.slice(0, 32),
        IR = I.slice(32)
  // Return each half of the hashed result in an array.
  return [ IL, IR ]
}

export function encode_extkey (
  hdkey : HDKey,
  key_prefix ?: number
) : string {
  const { seckey, pubkey, code, prev, path } = hdkey
  const prefix = (typeof key_prefix === 'number')
    ? Buff.num(key_prefix, 4)
    : (seckey !== null) ? 0x0488ade4 : 0x0488b21e
  const tweaks = parse_tweaks(path)
  const tprev  = tweaks.at(-1)
  const depth  = Buff.num(tweaks.length, 1)
  const fprint = (prev !== null) ? hash160(prev).slice(0, 4) : Buff.num(0, 4)
  const index  = (tprev !== undefined) ? tprev[0].slice(-4, 4) : Buff.num(0, 4)
  const key    = (seckey !== null) ? seckey.prepend(0x00) : pubkey
  return Buff.join([ prefix, depth, fprint, index, code, key ]).to_b58chk()
}

export function parse_extkey (
  keystr : string,
  path   : string = ''
) : HDKey {
  const { code, type, key } = decode_extkey(keystr)
  const is_private = (type === 0)
  const input_key  = (is_private) ? key : Buff.join([ type, key ])
  return derive(path, input_key, code, is_private)
}

export function decode_extkey (
  keystr : string
) : ExtKey {
  /* Import a Base58 formatted string as a
    * BIP32 (extended) KeyLink object.
    */
  const buffer = Buff.b58chk(keystr).stream

  const prefix = buffer.read(4).num,  // Version prefix.
        depth  = buffer.read(1).num,  // Parse depth ([0x00] for master).
        fprint = buffer.read(4).num,  // Parent key reference (0x00000000 for master).
        index  = buffer.read(4).num,  // Key index.
        code   = buffer.read(32).hex, // Chaincode.
        type   = buffer.read(1).num,  // Key type (or parity).
        key    = buffer.read(32).hex, // 32-byte key.
        seckey = (type === 0) ? key : undefined,
        pubkey = (type === 0) ? get_pubkey(key).hex : Buff.join([ type, key ]).hex

  if (buffer.size > 0) {
    throw new TypeError('Unparsed data remaining in buffer!')
  }

  return { prefix, depth, fprint, index, code, type, key, seckey, pubkey }
}
