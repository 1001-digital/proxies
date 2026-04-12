import { describe, it, expect } from 'vitest'
import { detectEip1822, EIP1822_PROXIABLE_SLOT } from '../../src'
import { encodeAddress, getMethod, getStorageSlot, rpcEnvelope } from '../helpers/abi'
import { createMockFetch } from '../helpers/mock-fetch'

const RPC = 'https://rpc.test'
const PROXY = '0x1111111111111111111111111111111111111111'
const IMPL = '0x' + 'ab'.repeat(20)

describe('detectEip1822', () => {
  it('returns impl target when the PROXIABLE slot is set', async () => {
    const fetchFn = createMockFetch([
      {
        match: (_, body) =>
          getMethod(body) === 'eth_getStorageAt'
          && getStorageSlot(body) === EIP1822_PROXIABLE_SLOT,
        response: { status: 200, body: rpcEnvelope(encodeAddress(IMPL)) },
      },
    ])
    const result = await detectEip1822(RPC, PROXY, fetchFn)
    expect(result).toEqual({
      pattern: 'eip-1822',
      targets: [{ address: IMPL }],
    })
  })

  it('returns null when the PROXIABLE slot is empty', async () => {
    const fetchFn = createMockFetch([
      {
        match: (_, body) =>
          getMethod(body) === 'eth_getStorageAt'
          && getStorageSlot(body) === EIP1822_PROXIABLE_SLOT,
        response: { status: 200, body: rpcEnvelope(encodeAddress('0x' + '00'.repeat(20))) },
      },
    ])
    expect(await detectEip1822(RPC, PROXY, fetchFn)).toBeNull()
  })
})
