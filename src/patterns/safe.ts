import { ZERO_ADDRESS } from '../constants'
import { parseAddress } from '../decode'
import { ethCall, ethGetCode, ethGetStorageAt } from '../rpc'
import type { RawProxy } from '../types'

const SAFE_SINGLETON_SLOT = '0x0000000000000000000000000000000000000000000000000000000000000000'
const MASTER_COPY_SELECTOR = '0xa619486e'

function hasCode(code: string): boolean {
  return code !== '0x' && code !== '0x0'
}

function hasSafeProxyBytecodeShape(code: string): boolean {
  const body = code.toLowerCase().replace(/^0x/, '')
  return body.includes(MASTER_COPY_SELECTOR.slice(2)) && body.includes('f4')
}

/**
 * Detect a Gnosis Safe proxy — the singleton (implementation) address is
 * stored at storage slot 0.
 *
 * Returns `null` when slot 0 is empty, not address-shaped, or the contract
 * does not expose SafeProxy-specific behavior.
 *
 * Slot 0 alone is not enough: many ordinary contracts store an owner,
 * controller, resolver, or other address there. SafeProxy additionally has a
 * `masterCopy()` fallback branch and delegatecalls to the singleton.
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

  let proxyCode: string
  let implCode: string
  try {
    [proxyCode, implCode] = await Promise.all([
      ethGetCode(rpc, address, fetchFn),
      ethGetCode(rpc, impl, fetchFn),
    ])
  } catch {
    return null
  }

  if (!hasCode(implCode)) return null
  if (!hasSafeProxyBytecodeShape(proxyCode)) return null

  let masterCopy: string
  try {
    masterCopy = await ethCall(rpc, address, MASTER_COPY_SELECTOR, fetchFn)
  } catch {
    return null
  }

  if (parseAddress(masterCopy) !== impl) return null

  return {
    pattern: 'gnosis-safe',
    targets: [{ address: impl }],
  }
}
