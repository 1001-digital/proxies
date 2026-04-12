import { describe, it, expect } from 'vitest'
import { detectGnosisSafe } from '../../src'
import { encodeAddress, getMethod, getStorageSlot, rpcEnvelope } from '../helpers/abi'
import { createMockFetch } from '../helpers/mock-fetch'

const RPC = 'https://rpc.test'
const PROXY = '0x1111111111111111111111111111111111111111'
const SINGLETON = '0x' + 'ab'.repeat(20)
const SLOT_ZERO = '0x' + '0'.repeat(64)

describe('detectGnosisSafe', () => {
  it('returns impl target when storage slot 0 contains a singleton address', async () => {
    const fetchFn = createMockFetch([
      {
        match: (_, body) =>
          getMethod(body) === 'eth_getStorageAt'
          && getStorageSlot(body) === SLOT_ZERO,
        response: { status: 200, body: rpcEnvelope(encodeAddress(SINGLETON)) },
      },
    ])
    const result = await detectGnosisSafe(RPC, PROXY, fetchFn)
    expect(result).toEqual({
      pattern: 'gnosis-safe',
      targets: [{ address: SINGLETON }],
    })
  })

  it('returns null when slot 0 is zero', async () => {
    const fetchFn = createMockFetch([
      {
        match: (_, body) =>
          getMethod(body) === 'eth_getStorageAt'
          && getStorageSlot(body) === SLOT_ZERO,
        response: { status: 200, body: rpcEnvelope(encodeAddress('0x' + '00'.repeat(20))) },
      },
    ])
    expect(await detectGnosisSafe(RPC, PROXY, fetchFn)).toBeNull()
  })

  it('returns null when slot 0 contains non-address data', async () => {
    const fetchFn = createMockFetch([
      {
        match: (_, body) =>
          getMethod(body) === 'eth_getStorageAt'
          && getStorageSlot(body) === SLOT_ZERO,
        // High bytes set → not address-shaped
        response: { status: 200, body: rpcEnvelope('0xff' + '00'.repeat(31)) },
      },
    ])
    expect(await detectGnosisSafe(RPC, PROXY, fetchFn)).toBeNull()
  })
})
