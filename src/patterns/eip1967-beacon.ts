import { EIP1967_BEACON_SLOT, IMPLEMENTATION_SELECTOR, ZERO_ADDRESS } from '../constants'
import { parseAddress } from '../decode'
import { ethCall, ethGetStorageAt } from '../rpc'
import type { RawProxy } from '../types'

/**
 * Detect an EIP-1967 beacon proxy.
 *
 * Reads the beacon slot (`0xa3f0…750d`); if non-zero, calls `implementation()`
 * on the beacon contract. Returns `null` when the slot is empty or the beacon
 * call fails.
 */
export async function detectEip1967Beacon(
  rpc: string,
  address: string,
  fetchFn: typeof globalThis.fetch,
): Promise<RawProxy | null> {
  let beaconRaw: string
  try {
    beaconRaw = await ethGetStorageAt(rpc, address, EIP1967_BEACON_SLOT, fetchFn)
  } catch {
    return null
  }

  const beacon = parseAddress(beaconRaw)
  if (!beacon || beacon === ZERO_ADDRESS) return null

  let implRaw: string
  try {
    implRaw = await ethCall(rpc, beacon, IMPLEMENTATION_SELECTOR, fetchFn)
  } catch {
    return null
  }

  const impl = parseAddress(implRaw)
  if (!impl || impl === ZERO_ADDRESS) return null

  return {
    pattern: 'eip-1967-beacon',
    targets: [{ address: impl }],
    beacon,
  }
}
