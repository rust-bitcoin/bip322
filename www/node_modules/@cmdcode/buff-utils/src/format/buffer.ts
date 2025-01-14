import { bigToBytes }    from './big.js'
import { numToBytes }    from './num.js'
import { hexToBytes }    from './str.js'
import { type Bytes, type Endian } from '../types.js'

import * as util from '../utils.js'

export function buffer_data (
  data    : Bytes | Bytes[] | ArrayBuffer,
  size   ?: number,
  endian ?: Endian
) : Uint8Array {
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data)
  } else if (data instanceof Uint8Array) {
    return util.set_buffer(data, size, endian)
  } else if (Array.isArray(data)) {
    const bytes = data.map(e => buffer_data(e, size, endian))
    return util.join_array(bytes)
  } else if (typeof data === 'string') {
    return hexToBytes(data, size, endian)
  } else if (typeof data === 'bigint') {
    return bigToBytes(data, size, endian)
  } else if (typeof data === 'number') {
    return numToBytes(data, size, endian)
  } else if (typeof data === 'boolean') {
    return Uint8Array.of(data ? 1 : 0)
  }
  throw new TypeError('Unsupported format:' + String(typeof data))
}
