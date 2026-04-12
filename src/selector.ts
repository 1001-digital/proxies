import { keccak_256 } from '@noble/hashes/sha3'
import type { AbiFunctionLike, AbiParam } from './types'

const encoder = new TextEncoder()

/**
 * Compute the 4-byte selector for a canonical function signature.
 * Example: `computeSelector('transfer(address,uint256)')` → `'0xa9059cbb'`.
 */
export function computeSelector(signature: string): string {
  const hash = keccak_256(encoder.encode(signature))
  let hex = '0x'
  for (let i = 0; i < 4; i++) {
    hex += hash[i].toString(16).padStart(2, '0')
  }
  return hex
}

/**
 * Build the canonical signature for an ABI function/event/error entry,
 * recursively expanding `tuple` into `(innerTypes)` while preserving any
 * `[]` or `[N]` array suffix. This is the form hashed to produce selectors.
 */
export function canonicalSignature(fn: AbiFunctionLike): string {
  if (!fn.name) throw new Error('Cannot build signature: entry has no name')
  const types = (fn.inputs ?? []).map(canonicalType).join(',')
  return `${fn.name}(${types})`
}

function canonicalType(p: AbiParam): string {
  if (p.type.startsWith('tuple')) {
    const suffix = p.type.slice('tuple'.length)
    const inner = (p.components ?? []).map(canonicalType).join(',')
    return `(${inner})${suffix}`
  }
  return p.type
}
