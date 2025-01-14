import { Buff } from '@cmdcode/buff-utils'

export type Literal = (string | number | boolean | null)

export interface PointData { x : bigint, y : bigint }

export interface HDKey {
  prev   : Buff | null
  seckey : Buff | null
  pubkey : Buff
  path   : string
  code   : Buff
}

export interface ExtKey {
  prefix  : number
  depth   : number
  fprint  : number
  index   : number
  code    : string
  type    : number
  key     : string
  seckey ?: string
  pubkey  : string
}

export interface ProofData {
  ref    : string
  pub    : string
  pid    : string
  sig    : string
  params : string[][]
}

export interface SignedEvent {
  pubkey     : string
  created_at : number
  id         : string
  sig        : string
  kind       : number
  content    : string
  tags       : Literal[][]
}
