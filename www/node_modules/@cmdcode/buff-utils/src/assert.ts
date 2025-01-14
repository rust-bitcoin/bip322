export function within_size (
  data : number[] | Uint8Array,
  size : number
) : void {
  if (data.length > size) {
    throw new TypeError(`Data is larger than array size: ${data.length} > ${size}`)
  }
}

export function is_hex (hex : string) : void {
  if (hex.match(/[^a-fA-f0-9]/) !== null) {
    throw new TypeError('Invalid characters in hex string: ' + hex)
  }
  if (hex.length % 2 !== 0) {
    throw new Error(`Length of hex string is invalid: ${hex.length}`)
  }
}

export function is_json (str : string) : void {
  try {
    JSON.parse(str)
  } catch {
    throw new TypeError('JSON string is invalid!')
  }
}

export function is_safe_num (num : number) : void {
  if (num > Number.MAX_SAFE_INTEGER) {
    throw new TypeError('Number exceeds safe bounds!')
  }
}

export function is_prefix (
  actual : string,
  target : string
) : void {
  if (actual !== target) {
    throw new TypeError(`Bech32 prefix does not match: ${actual} !== ${target}`)
  }
}
