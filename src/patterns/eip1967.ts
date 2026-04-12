import { EIP1967_ADMIN_SLOT, EIP1967_IMPL_SLOT } from '../constants'
import { parseAddress } from '../decode'
import { ethGetStorageAt } from '../rpc'
import type { RawProxy } from '../types'

/**
 * Detect an EIP-1967 transparent or UUPS proxy.
 *
 * Reads the implementation slot (`0x3608…3bc3`). If non-zero, reads the admin
 * slot in parallel and attaches it when present.
 *
 * Returns `null` when the implementation slot is empty or malformed.
 */
export async function detectEip1967(
  rpc: string,
  address: string,
  fetchFn: typeof globalThis.fetch,
): Promise<RawProxy | null> {
  let implRaw: string
  let adminRaw: string
  try {
    [implRaw, adminRaw] = await Promise.all([
      ethGetStorageAt(rpc, address, EIP1967_IMPL_SLOT, fetchFn),
      ethGetStorageAt(rpc, address, EIP1967_ADMIN_SLOT, fetchFn).catch(() => '0x'),
    ])
  } catch {
    return null
  }

  const impl = parseAddress(implRaw)
  if (!impl || impl === '0x0000000000000000000000000000000000000000') return null

  const proxy: RawProxy = {
    pattern: 'eip-1967',
    targets: [{ address: impl }],
  }

  const admin = parseAddress(adminRaw)
  if (admin && admin !== '0x0000000000000000000000000000000000000000') {
    proxy.admin = admin
  }

  return proxy
}
