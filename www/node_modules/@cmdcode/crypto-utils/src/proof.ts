import { Buff, Bytes }  from '@cmdcode/buff-utils'
import { get_pubkey }   from './keys.js'
import { sign, verify } from './sig.js'
import { SignOptions }  from './config.js'

import * as assert from './assert.js'
import * as util   from './util.js'

import {
  Literal,
  ProofData,
  SignedEvent
} from './types.js'

const PROOF_DEFAULTS = {
  kind  : 20000,
  stamp : 0x00000000,
  tags  : [] as Literal[][]
}

export function create_proof <T> (
  seckey   : Bytes,
  data     : T,
  params  ?: Literal[][],
  options ?: SignOptions
) : string {
  const { kind, stamp, tags } = parse_config(params ?? [])
  // Stringify data.
  const content = util.stringify(data)
  // Get public key from signer.
  const pub = get_pubkey(seckey, true).hex
  // Create a reference hash from the content string.
  const ref = Buff.str(content).digest
  // Build the pre-image that we will be hashing.
  const img = [ 0, pub, stamp, kind, tags, content ]
  // Compute the proof id from the image.
  const pid = Buff.json(img).digest
  // Compute a signature for the given id.
  const sig = sign(pid, seckey, options)
  // Return proof as a hex string (with optional query string).
  return Buff.join([ ref, pub, pid, sig ]).hex + encode_params(params)
}

export function parse_proof (proof : string) : ProofData {
  const [ hexstr, query ] = proof.split('?')
  const stream = Buff.hex(hexstr).stream
  assert.ok(stream.size === 160)
  return {
    ref    : stream.read(32).hex,
    pub    : stream.read(32).hex,
    pid    : stream.read(32).hex,
    sig    : stream.read(64).hex,
    params : decode_params(query)
  }
}

export function parse_proofs (
  proofs : string[]
) : ProofData[] {
  return proofs.map(e => parse_proof(e))
}

export function validate_proof (proof : string) : boolean {
  // Use regex to check that proof hex is valid (160 * 2 hex bytes)
  // also use regex to check that param string is valid (url params)
  const regex = /^[0-9a-fA-F]{320}(?:\?[A-Za-z0-9_]+=[A-Za-z0-9_]+(?:&[A-Za-z0-9_]+=[A-Za-z0-9_]+)*)?$/
  return regex.test(proof)
}

export function verify_proof <T> (
  proof    : string,
  data     : T,
  options ?: SignOptions
) : boolean {
  const { throws = false } = options ?? {}
  // Parse the proof data from the hex string.
  const { ref, pub, pid, sig, params } = parse_proof(proof)
  // Parse the configuration from params.
  const { kind, stamp, tags } = parse_config(params)
  // Stringify the data object into a content string.
  const content = util.stringify(data)
  // Hash the content string.
  const content_ref = Buff.str(content).digest.hex
  // Check if the hash does not match our link.
  if (content_ref !== ref) {
    return assert.fail('Content hash does not match reference hash!', throws)
  }
  // Assemble the pre-image for the hashing function.
  const img = [ 0, pub, stamp, kind, tags, content ]
  // Stringify and hash the preimage.
  const proof_hash = Buff.json(img).digest
  // Check if the hash does not match our id.
  if (proof_hash.hex !== pid) {
    return assert.fail('Proof hash does not equal proof id!', throws)
  }
  // Check if the signature is invalid.
  if (!verify(sig, pid, pub)) {
    return assert.fail('Proof signature is invalid!', throws)
  }
  // If all other tests pass, then the proof is valid.
  return true
}

export function create_event <T> (
  proof : string,
  data  : T
) : SignedEvent {
  // Serialize the data object into a string.
  const content = util.stringify(data)
  // Parse the proof data from the hex string.
  const { pub, pid, sig, params } = parse_proof(proof)
  // Parse the proof config from the params.
  const { kind, stamp, tags } = parse_config(params)
  // Return the proof formatted as a nostr event.
  return { kind, content, tags, pubkey: pub, id: pid, sig, created_at: stamp }
}

export function encode_params (
  params : Literal[][] = []
) : string {
  // Convert all param data into strings.
  const strings = params.map(e => [ String(e[0]), String(e[1]) ])
  // Return the params as a query string.
  return (params.length !== 0)
    ? '?' + new URLSearchParams(strings).toString()
    : ''
}

export function decode_params (str ?: string) : string[][] {
  // Return the query string as an array of params.
  return (typeof str === 'string')
    ? [ ...new URLSearchParams(str) ]
    : []
}

export function parse_config (
  params : Literal[][] = []
) : typeof PROOF_DEFAULTS {
  // Unpack the params array.
  const { kind, stamp, ...rest } = Object.fromEntries(params)
  // Return the config data.
  return {
    tags  : Object.entries(rest).map(([ k, v ]) => [ k, String(v) ]),
    kind  : (kind  !== undefined) ? Number(kind)  : PROOF_DEFAULTS.kind,
    stamp : (stamp !== undefined) ? Number(stamp) : PROOF_DEFAULTS.stamp
  }
}
