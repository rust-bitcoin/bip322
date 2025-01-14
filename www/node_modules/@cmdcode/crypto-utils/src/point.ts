import { Buff, Bytes } from '@cmdcode/buff-utils'
import { secp256k1 }   from '@noble/curves/secp256k1'
import { _1n }         from './const.js'
import { PointData }   from './types.js'
import { convert_33 }  from './keys.js'

const ECPoint = secp256k1.ProjectivePoint

export const Noble = ECPoint

export function is_even (p : PointData) : boolean {
  const pa = new ECPoint(p.x, p.y, _1n)
  return pa.hasEvenY()
}

export function is_point (point ?: unknown) : point is PointData {
  const p = point as Record<string, unknown>
  return (
    (typeof p === 'object' && p !== null) &&
    (typeof p.x === 'bigint' && typeof p.y === 'bigint')
  )
}

export function is_valid (point ?: unknown) : point is PointData {
  if (!is_point(point)) return false
  const pt = new ECPoint(point.x, point.y, _1n)
  try {
    pt.assertValidity()
    return true
  } catch { return false }
}

export function assert_valid (p : unknown) : asserts p is PointData {
  if (!is_valid(p)) {
    throw new Error('ECC point is invalid: ' + String(p))
  }
}

export function negate (
  a : PointData
) : PointData | null {
  const pa = new ECPoint(a.x, a.y, _1n)
  try {
    const pc = pa.negate()
    pc.assertValidity()
    return { x: pc.x, y: pc.y }
  } catch { return null }
}

export function add (
  a : PointData | null,
  b : PointData | null
) : PointData | null {
  if (a === null) return b
  if (b === null) return a
  const pa = new ECPoint(a.x, a.y, _1n)
  const pb = new ECPoint(b.x, b.y, _1n)
  try {
    const pc = pa.add(pb)
    pc.assertValidity()
    return { x: pc.x, y: pc.y }
  } catch { return null }
}

export function sub (
  a : PointData | null,
  b : PointData | null
) : PointData | null {
  if (a === null) return b
  if (b === null) return a
  const pa = new ECPoint(a.x, a.y, _1n)
  const pb = new ECPoint(b.x, b.y, _1n)
  try {
    const pc = pa.subtract(pb)
    pc.assertValidity()
    return { x: pc.x, y: pc.y }
  } catch { return null }
}

export function eq (
  a : PointData | null,
  b : PointData | null
) : boolean {
  if (a === null && b === null) {
    return true
  }
  if (a !== null && b !== null) {
    return (a.x === b.x && a.y === b.y)
  }
  return false
}

export function mul (
  a : PointData | null,
  b : Bytes
) : PointData | null {
  if (a === null) return null
  try {
    const buff = Buff.bytes(b)
    const pa = new ECPoint(a.x, a.y, _1n)
    const pc = pa.multiply(buff.big)
    pc.assertValidity()
    return { x: pc.x, y: pc.y }
  } catch { return null }
}

export function gen (
  b : Bytes
) : PointData {
  const buff = Buff.bytes(b)
  const base = ECPoint.BASE
  const pt   = base.multiply(buff.big)
  pt.assertValidity()
  return { x: pt.x, y: pt.y }
}

export function lift_x (
  bytes : Bytes,
  xonly = false
) : PointData {
  const buff  = convert_33(bytes, xonly)
  const point = ECPoint.fromHex(buff.hex)
  point.assertValidity()
  return { x: point.x, y: point.y }
}

export function to_bytes (p : PointData) : Buff {
  const bytes  = Buff.big(p.x, 32)
  const parity = is_even(p) ? 0x02 : 0x03
  return Buff.join([ parity, bytes ])
}
