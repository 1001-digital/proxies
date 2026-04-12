import { detectDiamond } from './patterns/diamond'
import { detectEip1167 } from './patterns/eip1167'
import { detectEip1822 } from './patterns/eip1822'
import { detectEip1967 } from './patterns/eip1967'
import { detectEip1967Beacon } from './patterns/eip1967-beacon'
import { detectEip897 } from './patterns/eip897'
import { detectGnosisSafe } from './patterns/safe'
import type { RawProxy } from './types'

type Detector = (
  rpc: string,
  address: string,
  fetchFn: typeof globalThis.fetch,
) => Promise<RawProxy | null>

/**
 * Priority order used by {@link detectProxy}. First detector that returns
 * non-null wins. Diamonds come first because the loupe probe is a specific,
 * low-false-positive signal; standard storage slots follow; Safe's slot-0
 * convention and EIP-897's `implementation()` view function come last.
 */
const DETECTORS: Detector[] = [
  detectDiamond,
  detectEip1967,
  detectEip1967Beacon,
  detectEip1822,
  detectEip1167,
  detectGnosisSafe,
  detectEip897,
]

/**
 * Detect any supported proxy pattern at `address`.
 *
 * Tries the built-in detectors in priority order (`eip-2535-diamond → eip-1967
 * → eip-1967-beacon → eip-1822 → eip-1167 → gnosis-safe → eip-897`). Returns
 * the first match, or `null` when no pattern matches.
 *
 * Each detector runs with error isolation — an RPC failure in one pattern does
 * not poison the probe for subsequent ones.
 *
 * Single-hop only: if the resolved implementation is itself a proxy, the
 * result describes the direct pattern only. Re-run detection on the resolved
 * implementation to chain manually.
 */
export async function detectProxy(
  rpc: string,
  address: string,
  fetchFn: typeof globalThis.fetch,
): Promise<RawProxy | null> {
  for (const detect of DETECTORS) {
    try {
      const match = await detect(rpc, address, fetchFn)
      if (match) return match
    } catch {
      // Detector-level errors shouldn't block later detectors
    }
  }
  return null
}
