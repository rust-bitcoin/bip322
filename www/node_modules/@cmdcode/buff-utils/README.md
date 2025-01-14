# Buff Utils

The swiss-army-knife of byte manipulation.

Features:
 * Move between all data formats with ease!
 * Encode / decode between Base58, Base64, Bech32 and more.
 * Buffer object recognized as native Uint8Array.
 * Prepend, append, sort, split and join arrays of multiple formats.
 * Read and prefix varints.
 * Convert byte blobs into consumable streams.
 * Uses `DataView.setUint8` for ultra-fast performace.
 * Supports endianess for all the things!

## Import

Example import into a browser-based project:

```html
<script src="https://unpkg.com/@cmdcode/buff-utils/dist/browser.js"></script>
<script> const { Buff, Bytes } = window.buff_utils </script>
```

Example import into a commonjs project:

```ts
const { Buff, Bytes } = require('@cmdcode/buff-utils')
```

Example import into an ES module project:

```ts
import { Buff, Bytes } from '@cmdcode/buff-utils'
```

## How to Use

The `Buff` class is an extention of the base Uint8Array class. It provides the same default functionality of a Uint8Array, and can be used as a drop-in replacement for Uint8Array. Typescript will treat Buff as a Uint8Array object.

```ts
import { Buff, Bytes } from '@cmdcode/buff-utils'

// Bytes covers value types that are convertable to Uint8Array.
type Bytes  = string | number | bigint | Uint8Array | Buff
// You can optionally specify the endianess of data.
type Endian = 'le' | 'be'

const bytes = new Buff (
  data    : Bytes | Bytes[] | ArrayBuffer,  
  size   ?: number, // Specify the size of the array (for padding)
  endian ?: Endian  // Specify the endianess of the array.
)

```
You can convert from many different types and formats into a `Buff` object.

```ts
Buff
  .any     = (data : any, size ?: number)        => Buff,
  .raw     = (data : Uint8Array, size ?: number) => Buff,
  .str     = (data : string, size ?: number)     => Buff,
  .hex     = (data : string, size ?: number)     => Buff,
  .bin     = (data : string, size ?: number)     => Buff,
  .num     = (data : number, size ?: number)     => Buff,
  .big     = (data : bigint, size ?: number)     => Buff,
  .bytes   = (data : Bytes,  size ?: number)     => Buff,
  .json    = (data : T,  replacer ?: Replacer)   => Buff,
  .b58chk  = (data : string)                     => Buff,
  .base64  = (data : string)                     => Buff,
  .b64url  = (data : string)                     => Buff,

  .bech32  = (
    data        : string,  // Data to be encoded
    limit      ?: number,  // Enforce a character limit.
    chk_prefix ?: string   // Enforce a certain prefix.
  ) => Buff,

  .bech32m = (
    data        : string,  // Data to be encoded
    limit      ?: number,  // Enforce a character limit.
    chk_prefix ?: string   // Enforce a certain prefix.
  ) => Buff
}
```

With `Buff`, you have access to an extensive API for converting between formats.

```ts
const bytes = new Buff(data)

/* Quicky convert into many formats using getters. */

bytes
  .arr     => number[]    // Convert to a number array.
  .num     => number      // Convert to a Number.
  .big     => bigint      // Convert to a BigInt.
  .str     => string      // Convert to a UTF8 string.
  .hex     => string      // Convert to a hex string.
  .raw     => Uint8Array  // Convert to a pure Uint8Array.
  .bin     => string      // Convert to a binary string.
  .b58chk  => string      // Convert to base58 with checksum.
  .base64  => string      // Convert to base64 string.
  .b64url  => string      // Convert to base64url string.
  .digest  => Buff        // Convert to a sha256 digest.
  .id      => string      // Convert to a digest (hex string).
  .stream  => Stream      // Convert to a Stream object.

/* There are a few export methods that support extra params. */

bytes
  .toNum     : (endian ?: Endian)                  => number
  .toBig     : (endian ?: Endian)                  => bigint
  .toBin     : ()                                  => string
  .toHash    : ()                                  => Buff
  .toJson    : (reviver ?: Reviver)                => T
  .toBech32  : (prefix : string, limit ?: number)  => string
  .toBech32m : (prefix : string, limit ?: number)  => string
```

In addition to format conversion, you can perform many other convenient tasks.

```ts
Buff = {
  // Standard UTF-8 string-to-bytes encoding.
  encode : (str : string) => Uint8Array,
  // Standard UTF-8 bytes-to-string decoding.
  decode : (bytes : Uint8Array) => string,
  // Same as Uint8Array.from(), but returns a Buff object.
  from (data : Uint8Array | number[]) => Buff
  // Same as Uint8Array.of(), but returns a Buff object.
  of (...data : number[]) => Buff,
  // Join together multiple arrays of bytes.
  join : (array : Bytes[]) => Buff,
  // Sort multiple arrays of bytes in lexicographic order.
  sort (arr : Bytes[], size ?: number) => Buff[],
  // Return a buffer object with random data (uses webcrypto).
  random (size : number) => Buff,
  // Converts a number into a 'varint' for byte streams.
  varInt : (num : number, endian ?: Endian) => Buff
}

const bytes = new Buff(data)

bytes
  // Append data to your ubber object
  .append (data : Bytes) => Buff
  // Prepend data to your buffer object.
  .prepend (data : Bytes) => Buff
  // Encode the size of your buffer as a varint and prepend it.
  .prefixSize (endian ?: Endian) => Buff
  // Same as Uint8Array.reverse(), but returns a Buff object.
  .reverse () => Buff
  // Identical to Uint8Array.set() method.
  .set (array : ArrayLike<number>, offset ?: number) => void
  // Same as Uint8Array.slice(), but returns a Buff object.
  .slice (start ?: number, end ?: number) => Buff
  // Same as Uint8Array.subarray(), but returns a Buff object.
  .subarray (begin ?: number, end ?: number) => Buff
  // Same as Uint8Array.set(), but allows Bytes as input.
  .write (data : Bytes, offset ?: number) => void
```

The `Stream` tool will take a blob of data and allow you to consume it byte-per-byte.

```ts
import { Stream } from '@cmdcode/buff-utils'

// Convert data into a stream object.
const stream = new Stream(data)

// You can convert a buff object into a stream.
const stream = new Buff(data).stream

stream
  // Reads x number of bytes, does not consume the stream.
  .peek(size: number) => Buff
  // Reads x number of bytes, consumes the stream.
  .read(size: number) => bytes
  // Reads the next bytes(s) as a varint, returns the number value.
  .readSize (endian ?: Endian) => number
```

A number of utilities are available as stand-alone packages for import.

```ts
import {
  Encoder, Hash, Hex, Txt, assert, buffer, util
} from '@cmdcode/buff-utils'
```

## Dependencies

This library uses minimal dependences.

**@scure/base**  
For performing encoding and decoding of many formats.  
https://github.com/paulmillr/scure-base

**@noble/hashes**
For creating hashes using `sha256`.  
https://github.com/paulmillr/noble-hashes

Special thanks to Paul Miller for his wonderful work.

## Bugs / Issues

Please feel free to post any questions or bug reports on the issues page!

## Testing

This project uses `tape` for unit tests, and `nyc` for formatting.

```bash
yarn install && yarn test
npm  install && npm run test
```

## Development

This project uses `eslint` and `typescript` for development, plus `rollup` for bundling releases.

```bash
yarn install && yarn release
npm  install && npm run release
```

## Contributions

All contributions are welcome!

## License

Use this code however you like! No warranty!
