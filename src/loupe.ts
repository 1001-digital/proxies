import {
  DIAMOND_LOUPE_INTERFACE_ID,
  FACETS_SELECTOR,
  SUPPORTS_INTERFACE_SELECTOR,
  ZERO_ADDRESS,
} from './constants'
import { decodeFacets, parseBool } from './decode'
import { ethCall } from './rpc'
import type { RawFacet } from './types'

/**
 * Detect whether a contract implements ERC-2535 (Diamond) and return its facets.
 * Returns `null` if not a diamond. Returns a non-empty array of facets otherwise.
 *
 * Strategy:
 *   1. Try ERC-165 `supportsInterface(0x48e2b093)`.
 *      - Valid bool `true`  → fetch and return facets
 *      - Valid bool `false` → definitively not a diamond (null)
 *      - Malformed / error  → fall through to step 2
 *   2. Probe `facets()` directly. If it returns a non-empty decoded array,
 *      treat the contract as a diamond.
 *
 * Zero-address facets (deleted selectors) are filtered out of the result.
 */
export async function detectAndFetchFacets(
  rpc: string,
  address: string,
  fetchFn: typeof globalThis.fetch,
): Promise<RawFacet[] | null> {
  const calldata = SUPPORTS_INTERFACE_SELECTOR
    + DIAMOND_LOUPE_INTERFACE_ID.slice(2).padEnd(64, '0')

  try {
    const res = await ethCall(rpc, address, calldata, fetchFn)
    const bool = parseBool(res)
    if (bool === true) return tryFacets(rpc, address, fetchFn)
    if (bool === false) return null
    // Malformed response — fall through to facets() probe
  } catch {
    // RPC/revert error — fall through to facets() probe
  }

  return tryFacets(rpc, address, fetchFn)
}

// Minimum valid `facets()` payload: outer offset word + length word = 2 × 32
// bytes → 128 hex chars + '0x' prefix.
const MIN_FACETS_PAYLOAD_LEN = 130

async function tryFacets(
  rpc: string,
  address: string,
  fetchFn: typeof globalThis.fetch,
): Promise<RawFacet[] | null> {
  let res: string
  try {
    res = await ethCall(rpc, address, FACETS_SELECTOR, fetchFn)
  } catch {
    return null
  }

  if (res === '0x' || res.length < MIN_FACETS_PAYLOAD_LEN) return null

  let facets: RawFacet[]
  try {
    facets = decodeFacets(res)
  } catch {
    return null
  }

  const live = facets.filter(f => f.facetAddress !== ZERO_ADDRESS)
  return live.length > 0 ? live : null
}
