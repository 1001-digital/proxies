import { ZERO_ADDRESS } from '../constants'
import { parseAddress } from '../decode'
import { ethGetStorageAt } from '../rpc'
import type { RawProxy } from '../types'

const SAFE_SINGLETON_SLOT = '0x0000000000000000000000000000000000000000000000000000000000000000'

/**
 * Detect a Gnosis Safe proxy — the singleton (implementation) address is
 * stored at storage slot 0.
 *
 * Returns `null` when slot 0 is empty or not address-shaped.
 *
 * Cheap, but has a higher false-positive surface than the standard slots
 * because any contract may use storage slot 0. Detector priority puts this
 * after all EIP-standard patterns to keep the match rate clean.
 */
export async function detectGnosisSafe(
  rpc: string,
  address: string,
  fetchFn: typeof globalThis.fetch,
): Promise<RawProxy | null> {
  let raw: string
  try {
    raw = await ethGetStorageAt(rpc, address, SAFE_SINGLETON_SLOT, fetchFn)
  } catch {
    return null
  }

  const impl = parseAddress(raw)
  if (!impl || impl === ZERO_ADDRESS) return null

  return {
    pattern: 'gnosis-safe',
    targets: [{ address: impl }],
  }
}
