import { describe, it, expect } from 'vitest'
import { detectEip1967, EIP1967_ADMIN_SLOT, EIP1967_IMPL_SLOT } from '../../src'
import { encodeAddress, getMethod, getStorageSlot, rpcEnvelope, rpcRevert } from '../helpers/abi'
import { createMockFetch } from '../helpers/mock-fetch'

const RPC = 'https://rpc.test'
const PROXY = '0x1111111111111111111111111111111111111111'
const IMPL = '0x' + 'ab'.repeat(20)
const ADMIN = '0x' + 'cd'.repeat(20)

describe('detectEip1967', () => {
  it('returns impl target when the implementation slot is set', async () => {
    const fetchFn = createMockFetch([
      {
        match: (_, body) =>
          getMethod(body) === 'eth_getStorageAt'
          && getStorageSlot(body) === EIP1967_IMPL_SLOT,
        response: { status: 200, body: rpcEnvelope(encodeAddress(IMPL)) },
      },
      {
        match: (_, body) =>
          getMethod(body) === 'eth_getStorageAt'
          && getStorageSlot(body) === EIP1967_ADMIN_SLOT,
        response: { status: 200, body: rpcEnvelope(encodeAddress('0x' + '00'.repeat(20))) },
      },
    ])
    const result = await detectEip1967(RPC, PROXY, fetchFn)
    expect(result).toEqual({
      pattern: 'eip-1967',
      targets: [{ address: IMPL }],
    })
  })

  it('attaches admin when the admin slot is non-zero', async () => {
    const fetchFn = createMockFetch([
      {
        match: (_, body) =>
          getMethod(body) === 'eth_getStorageAt'
          && getStorageSlot(body) === EIP1967_IMPL_SLOT,
        response: { status: 200, body: rpcEnvelope(encodeAddress(IMPL)) },
      },
      {
        match: (_, body) =>
          getMethod(body) === 'eth_getStorageAt'
          && getStorageSlot(body) === EIP1967_ADMIN_SLOT,
        response: { status: 200, body: rpcEnvelope(encodeAddress(ADMIN)) },
      },
    ])
    const result = await detectEip1967(RPC, PROXY, fetchFn)
    expect(result?.admin).toBe(ADMIN)
  })

  it('returns null when the implementation slot is zero', async () => {
    const fetchFn = createMockFetch([
      {
        match: (_, body) =>
          getMethod(body) === 'eth_getStorageAt'
          && getStorageSlot(body) === EIP1967_IMPL_SLOT,
        response: { status: 200, body: rpcEnvelope(encodeAddress('0x' + '00'.repeat(20))) },
      },
      {
        match: (_, body) =>
          getMethod(body) === 'eth_getStorageAt'
          && getStorageSlot(body) === EIP1967_ADMIN_SLOT,
        response: { status: 200, body: rpcEnvelope(encodeAddress('0x' + '00'.repeat(20))) },
      },
    ])
    expect(await detectEip1967(RPC, PROXY, fetchFn)).toBeNull()
  })

  it('returns null when the implementation slot is malformed', async () => {
    const fetchFn = createMockFetch([
      {
        match: (_, body) =>
          getMethod(body) === 'eth_getStorageAt'
          && getStorageSlot(body) === EIP1967_IMPL_SLOT,
        // Non-zero high bytes — not address-shaped
        response: { status: 200, body: rpcEnvelope('0xff' + '00'.repeat(31)) },
      },
      {
        match: (_, body) =>
          getMethod(body) === 'eth_getStorageAt'
          && getStorageSlot(body) === EIP1967_ADMIN_SLOT,
        response: { status: 200, body: rpcEnvelope(encodeAddress('0x' + '00'.repeat(20))) },
      },
    ])
    expect(await detectEip1967(RPC, PROXY, fetchFn)).toBeNull()
  })

  it('returns null when the RPC call reverts', async () => {
    const fetchFn = createMockFetch([
      {
        match: (_, body) => getMethod(body) === 'eth_getStorageAt',
        response: { status: 200, body: rpcRevert() },
      },
    ])
    expect(await detectEip1967(RPC, PROXY, fetchFn)).toBeNull()
  })
})
