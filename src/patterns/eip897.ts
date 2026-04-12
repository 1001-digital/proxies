import { IMPLEMENTATION_SELECTOR, ZERO_ADDRESS } from '../constants'
import { parseAddress } from '../decode'
import { ethCall } from '../rpc'
import type { RawProxy } from '../types'

/**
 * Detect an EIP-897 delegate proxy by calling `implementation()` as a view
 * function.
 *
 * Last-resort detector — any contract with a public `implementation()` view
 * returning a non-zero address will match. Only reached when all other
 * pattern detectors have returned `null`.
 *
 * Returns `null` when the call reverts or returns zero.
 */
export async function detectEip897(
  rpc: string,
  address: string,
  fetchFn: typeof globalThis.fetch,
): Promise<RawProxy | null> {
  let raw: string
  try {
    raw = await ethCall(rpc, address, IMPLEMENTATION_SELECTOR, fetchFn)
  } catch {
    return null
  }

  const impl = parseAddress(raw)
  if (!impl || impl === ZERO_ADDRESS) return null

  return {
    pattern: 'eip-897',
    targets: [{ address: impl }],
  }
}
