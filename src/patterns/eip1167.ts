import {
  EIP1167_BYTECODE_PREFIX,
  EIP1167_BYTECODE_SUFFIX,
  ZERO_ADDRESS,
} from '../constants'
import { ethGetCode } from '../rpc'
import type { RawProxy } from '../types'

/**
 * Detect an EIP-1167 minimal proxy (clone) from runtime bytecode.
 *
 * Matches the canonical 45-byte runtime:
 *   `363d3d373d3d3d363d73<20-byte impl>5af43d82803e903d91602b57fd5bf3`
 *
 * Does NOT match the "optimized" variants (e.g. push-based relays) that some
 * tooling emits — this is the standards-compliant shape per EIP-1167.
 *
 * Returns `null` when the bytecode does not match.
 */
export async function detectEip1167(
  rpc: string,
  address: string,
  fetchFn: typeof globalThis.fetch,
): Promise<RawProxy | null> {
  let code: string
  try {
    code = await ethGetCode(rpc, address, fetchFn)
  } catch {
    return null
  }

  const body = code.toLowerCase().replace(/^0x/, '')
  // 20 prefix + 40 address + 30 suffix = 90 hex chars
  if (body.length !== 90) return null
  if (!body.startsWith(EIP1167_BYTECODE_PREFIX)) return null
  if (!body.endsWith(EIP1167_BYTECODE_SUFFIX)) return null

  const impl = '0x' + body.slice(EIP1167_BYTECODE_PREFIX.length, EIP1167_BYTECODE_PREFIX.length + 40)
  if (impl === ZERO_ADDRESS) return null

  return {
    pattern: 'eip-1167',
    targets: [{ address: impl }],
  }
}
