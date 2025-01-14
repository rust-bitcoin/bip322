import { Buff } from '@cmdcode/buff-utils'

export function random (size ?: number) : Buff {
  return Buff.random(size)
}

export function increment_buffer (buffer : Uint8Array) : Uint8Array {
  /* Find the least significant integer value in the
   * data buffer (using LE), then increment it by one.
   */
  let i = buffer.length - 1
  for (i; i >= 0; i--) {
    if (buffer[i] < 255) {
      buffer.set([ buffer[i] + 1 ], i)
      return buffer
    }
  }
  throw TypeError('Unable to increment buffer: ' + buffer.toString())
}

export function stringify (content : unknown) : string {
  switch (typeof content) {
    case 'object':
      return JSON.stringify(content)
    case 'string':
      return content
    case 'bigint':
      return content.toString()
    case 'number':
      return content.toString()
    case 'boolean':
      return String(content)
    default:
      throw new TypeError('Content type not supported: ' + typeof content)
  }
}
