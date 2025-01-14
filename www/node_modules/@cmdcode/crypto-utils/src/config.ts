import { Bytes } from '@cmdcode/buff-utils'

export type SignOptions = Partial<SignConfig>

export interface SignConfig {
  aux          ?: Bytes | null
  adaptor      ?: Bytes
  nonce        ?: Bytes
  nonce_tweaks ?: Bytes[]
  recovery     ?: Bytes
  tweak        ?: Bytes
  throws        : boolean
  xonly         : boolean
}

const SIGN_DEFAULTS : SignConfig = {
  throws : false,
  xonly  : true
}

export function sign_config (
  config : SignOptions = {}
) : SignConfig {
  return { ...SIGN_DEFAULTS, ...config  }
}
