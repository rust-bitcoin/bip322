export function binToBytes (binary : string) : Uint8Array {
  const bins = binary.split('').map(Number)

  if (bins.length % 8 !== 0) {
    throw new Error(`Binary array is invalid length: ${binary.length}`)
  }

  const bytes = new Uint8Array(bins.length / 8)

  for (let i = 0, ct = 0; i < bins.length; i += 8, ct++) {
    let byte = 0
    for (let j = 0; j < 8; j++) {
      byte |= (bins[i + j] << (7 - j))
    }
    bytes[ct] = byte
  }

  return bytes
}

export function bytesToBin (bytes : Uint8Array) : string {
  // Create a binary array that is sized to (number of bytes) * 8.
  const bin = new Array(bytes.length * 8)

  let count = 0

  // Iterate through each number in the byte array.
  for (const num of bytes) {
    if (num > 255) {
      // Throw an error on invalid number ranges.
      throw new Error(`Invalid byte value: ${num}. Byte values must be between 0 and 255.`)
    }

    // Convert the current number into bits using bitwise operations.
    for (let i = 7; i >= 0; i--, count++) {
      bin[count] = (num >> i) & 1
    }
  }

  // Return the complete binary array.
  return bin.join('')
}
