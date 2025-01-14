import { sha256 }  from '@noble/hashes/sha256'
import { Encoder } from './encode.js'

import * as assert from './assert.js'
import * as fmt    from './format/index.js'
import * as util   from './utils.js'

import { Bytes, Endian, Replacer, Reviver } from './types.js'

export class Buff extends Uint8Array {
  static num      = numToBuff
  static big      = bigToBuff
  static bin      = binToBuff
  static raw      = rawToBuff
  static str      = strToBuff
  static hex      = hexToBuff
  static bytes    = buffer
  static json     = jsonToBuff
  static base64   = base64ToBuff
  static b64url   = b64urlToBuff
  static bech32   = bech32ToBuff
  static bech32m  = bech32mToBuff
  static b58chk   = b58chkToBuff
  static encode   = fmt.strToBytes
  static decode   = fmt.bytesToStr
  static parse    = parse_data
  static is_bytes = util.is_bytes
  static is_hex   = util.is_hex

  static random (size = 32) : Buff {
    const rand = util.random(size)
    return new Buff(rand, size)
  }

  static now (size = 4) : Buff {
    const stamp = Math.floor(Date.now() / 1000)
    return new Buff(stamp, size)
  }

  constructor (
    data    : Bytes | Bytes[] | ArrayBuffer,
    size   ?: number,
    endian ?: Endian
  ) {
    if (
      data instanceof Buff &&
      size === undefined
    ) {
      return data
    }

    const buffer = fmt.buffer_data(data, size, endian)
    super(buffer)
  }

  get arr () : number[] {
    return [ ...this ]
  }

  get num () : number {
    return this.to_num()
  }

  get big () : bigint {
    return this.to_big()
  }

  get str () : string {
    return this.to_str()
  }

  get hex () : string {
    return this.to_hex()
  }

  get raw () : Uint8Array {
    return new Uint8Array(this)
  }

  get bin () : string {
    return this.to_bin()
  }

  get b58chk () : string {
    return this.to_b58chk()
  }

  get base64 () : string {
    return this.to_base64()
  }

  get b64url () : string {
    return this.to_b64url()
  }

  get digest () : Buff {
    return this.to_hash()
  }

  get id () : string {
    return this.to_hash().hex
  }

  get stream () : Stream {
    return new Stream(this)
  }

  to_num (endian : Endian = 'be') : number {
    const bytes = (endian === 'be')
      ? this.reverse()
      : this
    return fmt.bytesToNum(bytes)
  }

  to_big (endian : Endian = 'be') : bigint {
    const bytes = (endian === 'be')
      ? this.reverse()
      : this
    return fmt.bytesToBig(bytes)
  }

  to_bin () : string {
    return fmt.bytesToBin(this)
  }

  to_hash () : Buff {
    const digest = sha256(this)
    return new Buff(digest)
  }

  to_json <T = any> (reviver ?: Reviver) : T {
    if (reviver === undefined) {
      reviver = util.bigint_reviver
    }
    const str = fmt.bytesToStr(this)
    return JSON.parse(str, reviver)
  }

  to_bech32 (
    prefix : string,
    limit ?: number
  ) : string {
    const { encode, to_words } = Encoder.bech32
    const words = to_words(this)
    return encode(prefix, words, limit)
  }

  to_bech32m (
    prefix : string,
    limit ?: number
  ) : string {
    const { encode, to_words } = Encoder.bech32m
    const words = to_words(this)
    return encode(prefix, words, limit)
  }

  to_str    () : string     { return fmt.bytesToStr(this) }
  to_hex    () : string     { return fmt.bytesToHex(this) }
  to_bytes  () : Uint8Array { return new Uint8Array(this) }
  to_b58chk () : string     { return Encoder.b58chk.encode(this) }
  to_base64 () : string     { return Encoder.base64.encode(this) }
  to_b64url () : string     { return Encoder.b64url.encode(this) }

  append (data : Bytes) : Buff {
    return Buff.join([ this, Buff.bytes(data) ])
  }

  prepend (data : Bytes) : Buff {
    return Buff.join([ Buff.bytes(data), this ])
  }

  reverse () : Buff {
    const arr = new Uint8Array(this).reverse()
    return new Buff(arr)
  }

  slice (start ?: number, end ?: number) : Buff {
    const arr = new Uint8Array(this).slice(start, end)
    return new Buff(arr)
  }

  set (array : ArrayLike<number>, offset ?: number) : void {
    this.set(array, offset)
  }

  subarray (begin ?: number, end ?: number) : Buff {
    const arr = new Uint8Array(this).subarray(begin, end)
    return new Buff(arr)
  }

  write (bytes : Bytes, offset ?: number) : void {
    const b = Buff.bytes(bytes)
    this.set(b, offset)
  }

  add_varint (endian ?: Endian) : Buff {
    const size = Buff.calc_varint(this.length, endian)
    return Buff.join([ size, this ])
  }

  static from (data : Uint8Array | number[]) : Buff {
    return new Buff(Uint8Array.from(data))
  }

  static of (...args : number[]) : Buff {
    return new Buff(Uint8Array.of(...args))
  }

  static join (arr : Bytes[]) : Buff {
    const bytes  = arr.map(e => Buff.bytes(e))
    const joined = util.join_array(bytes)
    return new Buff(joined)
  }

  static sort (arr : Bytes[], size ?: number) : Buff[] {
    const hex = arr.map(e => buffer(e, size).hex)
    hex.sort()
    return hex.map(e => Buff.hex(e, size))
  }

  static calc_varint (num : number, endian ?: Endian) : Buff {
    if (num < 0xFD) {
      return Buff.num(num, 1)
    } else if (num < 0x10000) {
      return Buff.of(0xFD, ...Buff.num(num, 2, endian))
    } else if (num < 0x100000000) {
      return Buff.of(0xFE, ...Buff.num(num, 4, endian))
    } else if (BigInt(num) < 0x10000000000000000n) {
      return Buff.of(0xFF, ...Buff.num(num, 8, endian))
    } else {
      throw new Error(`Value is too large: ${num}`)
    }
  }
}

function numToBuff (
  number  : number,
  size   ?: number,
  endian ?: Endian
) : Buff {
  return new Buff(number, size, endian)
}

function binToBuff (
  data    : string,
  size   ?: number,
  endian ?: Endian
) : Buff {
  return new Buff(fmt.binToBytes(data), size, endian)
}

function bigToBuff (
  bigint  : bigint,
  size   ?: number,
  endian ?: Endian
) : Buff {
  return new Buff(bigint, size, endian)
}

function rawToBuff (
  data    : Uint8Array,
  size   ?: number,
  endian ?: Endian
) : Buff {
  return new Buff(data, size, endian)
}

function strToBuff (
  data    : string,
  size   ?: number,
  endian ?: Endian
) : Buff {
  return new Buff(fmt.strToBytes(data), size, endian)
}

function hexToBuff (
  data    : string,
  size   ?: number,
  endian ?: Endian
) : Buff {
  return new Buff(data, size, endian)
}

function jsonToBuff <T> (
  data      : T,
  replacer ?: Replacer
) : Buff {
  if (replacer === undefined) {
    replacer = util.bigint_replacer
  }
  const str = JSON.stringify(data, replacer)
  return new Buff(fmt.strToBytes(str))
}

function base64ToBuff (
  data : string
) : Buff {
  return new Buff(Encoder.base64.decode(data))
}

function b64urlToBuff (
  data : string
) : Buff {
  return new Buff(Encoder.b64url.decode(data))
}

function bech32ToBuff (
  data        : string,
  limit      ?: number | false,
  chk_prefix ?: string
) : Buff {
  const { decode, to_bytes } = Encoder.bech32
  const { prefix, words } = decode(data, limit)
  const bytes = to_bytes(words)
  if (typeof chk_prefix === 'string') {
    assert.is_prefix(prefix, chk_prefix)
  }
  return new Buff(bytes)
}

function bech32mToBuff (
  data        : string,
  limit      ?: number | false,
  chk_prefix ?: string
) : Buff {
  const { decode, to_bytes } = Encoder.bech32m
  const { prefix, words } = decode(data, limit)
  const bytes = to_bytes(words)
  if (typeof chk_prefix === 'string') {
    assert.is_prefix(prefix, chk_prefix)
  }
  return new Buff(bytes)
}

function b58chkToBuff (
  data : string
) : Buff {
  return new Buff(Encoder.b58chk.decode(data))
}

function parse_data (
  data_blob  : Bytes,
  chunk_size : number,
  total_size : number
) : Buff[] {
  const bytes  = fmt.buffer_data(data_blob)
  const chunks = util.parse_data(bytes, chunk_size, total_size)
  return chunks.map(e => Buff.bytes(e))
}

export class Stream {
  public size : number
  public data : Uint8Array

  constructor (data : Bytes) {
    this.data = Buff.bytes(data)
    this.size = this.data.length
  }

  peek (size : number) : Buff {
    if (size > this.size) {
      throw new Error(`Size greater than stream: ${size} > ${this.size}`)
    }
    return new Buff(this.data.slice(0, size))
  }

  read (size : number) : Buff {
    const chunk = this.peek(size)
    this.data = this.data.slice(size)
    this.size = this.data.length
    return chunk
  }

  read_varint (endian ?: Endian) : number {
    const num = this.read(1).num
    switch (true) {
      case (num >= 0 && num < 0xFD):
        return num
      case (num === 0xFD):
        return this.read(2).to_num(endian)
      case (num === 0xFE):
        return this.read(4).to_num(endian)
      case (num === 0xFF):
        return this.read(8).to_num(endian)
      default:
        throw new Error(`Varint is out of range: ${num}`)
    }
  }
}

export function buffer (
  bytes : Bytes | Bytes[] | ArrayBuffer,
  size ?: number,
  end  ?: Endian
) : Buff {
  return new Buff(bytes, size, end)
}
