import { within_size }   from './assert.js'
import { Endian, Bytes } from './types.js'

const { getRandomValues } = crypto ?? globalThis.crypto ?? window.crypto

export function random (size = 32) : Uint8Array {
  if (typeof getRandomValues === 'function') {
    return crypto.getRandomValues(new Uint8Array(size))
  }
  throw new Error('Crypto module missing getRandomValues!')
}

export function is_hex (input : string) : boolean {
  if (
    input.match(/[^a-fA-f0-9]/) === null &&
    input.length % 2 === 0
  ) { return true }
  return false
}

export function is_bytes (input : any) : input is Bytes {
  if (
    typeof input === 'string' &&
    is_hex(input)
  ) {
    return true
  } else if (
    typeof input === 'number' ||
    typeof input === 'bigint' ||
    input instanceof Uint8Array
  ) {
    return true
  } else if (
    Array.isArray(input) &&
    input.every(e => typeof e === 'number')
  ) {
    return true
  } else  {
    return false
  }
}

export function set_buffer (
  data   : number[] | Uint8Array,
  size  ?: number,
  endian : Endian = 'be'
) : Uint8Array {
  if (size === undefined) size = data.length
  within_size(data, size)
  const buffer = new Uint8Array(size).fill(0)
  const offset = (endian === 'be') ? 0 : size - data.length
  buffer.set(data, offset)
  return buffer
}

export function join_array (
  arr : Array<Uint8Array | number[]>
) : Uint8Array {
  let i, offset = 0
  const size = arr.reduce((len, arr) => len + arr.length, 0)
  const buff = new Uint8Array(size)
  for (i = 0; i < arr.length; i++) {
    const a = arr[i]
    buff.set(a, offset)
    offset += a.length
  }
  return buff
}

export function bigint_replacer (_ : any, v : any) : any {
  return typeof v === 'bigint'
    ? `${v}n`
    : v
}

export function bigint_reviver (_ : any, v : any) : any {
  return typeof v === 'string' && /n$/.test(v)
    ? BigInt(v.slice(0, -1))
    : v
}

export function parse_data (
  data_blob  : Uint8Array,
  chunk_size : number,
  total_size : number
) : Uint8Array[] {
  const len   = data_blob.length,
        count = total_size / chunk_size
  if (total_size % chunk_size !== 0) {
    throw new TypeError(`Invalid parameters: ${total_size} % ${chunk_size} !== 0`)
  }
  if (len !== total_size) {
    throw new TypeError(`Invalid data stream: ${len} !== ${total_size}`)
  }
  if (len % chunk_size !== 0) {
    throw new TypeError(`Invalid data stream: ${len} % ${chunk_size} !== 0`)
  }
  const chunks = new Array(count)
  for (let i = 0; i < count; i++) {
    const idx = i * chunk_size
    chunks[i] = data_blob.subarray(idx, idx + chunk_size)
  }
  return chunks
}
