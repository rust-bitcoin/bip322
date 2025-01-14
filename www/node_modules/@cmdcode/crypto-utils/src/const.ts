import { secp256k1 } from '@noble/curves/secp256k1'
import { PointData } from './types.js'

const curve = secp256k1.CURVE

export const _N = curve.n
export const _P = curve.p

export const _G : PointData = { x: curve.Gx, y: curve.Gy }

export const _0n = BigInt(0)
export const _1n = BigInt(1)
export const _2n = BigInt(2)
export const _3n = BigInt(3)
export const _4n = BigInt(4)
