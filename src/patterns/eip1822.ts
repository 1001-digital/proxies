import { EIP1822_PROXIABLE_SLOT, ZERO_ADDRESS } from '../constants'
import { parseAddress } from '../decode'
import { ethGetStorageAt } from '../rpc'
import type { RawProxy } from '../types'

/**
 * Detect an EIP-1822 UUPS proxy.
 *
 * Reads the PROXIABLE slot (`keccak256('PROXIABLE')`). Returns `null` when the
 * slot is empty or malformed.
 *
 * Note: most modern UUPS proxies use the EIP-1967 slot instead — this detector
 * only catches the older EIP-1822 convention.
 */
export async function detectEip1822(
  rpc: string,
  address: string,
  fetchFn: typeof globalThis.fetch,
): Promise<RawProxy | null> {
  let raw: string
  try {
    raw = await ethGetStorageAt(rpc, address, EIP1822_PROXIABLE_SLOT, fetchFn)
  } catch {
    return null
  }

  const impl = parseAddress(raw)
  if (!impl || impl === ZERO_ADDRESS) return null

  return {
    pattern: 'eip-1822',
    targets: [{ address: impl }],
  }
}
