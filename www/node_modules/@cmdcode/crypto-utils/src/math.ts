import { Buff, Bytes } from '@cmdcode/buff-utils'
import { mod, pow }    from '@noble/curves/abstract/modular'
import { _N, _P, _0n } from './const.js'

export {
  mod,
  pow,
  pow2,
  invert
} from '@noble/curves/abstract/modular'

export const modN = (x : bigint) : bigint => mod(x, _N)
export const modP = (x : bigint) : bigint => mod(x, _P)
export const powN = (x : bigint, exp : bigint) : bigint => pow(x, exp, _N)

export const on_curve = (x : bigint) : boolean => {
  return typeof x === 'bigint' && _0n < x && x < _P
}
export const in_field = (x : bigint) : boolean => {
  return typeof x === 'bigint' && _0n < x && x < _N
}

export function mod_bytes (bytes : Bytes) : Buff {
  const b = Buff.bytes(bytes).big
  return Buff.big(modN(b), 32)
}
