import { describe, it, expect } from 'vitest'
import {
  detectEip1967Beacon,
  EIP1967_BEACON_SLOT,
  IMPLEMENTATION_SELECTOR,
} from '../../src'
import {
  encodeAddress,
  getAddressParam,
  getCalldata,
  getMethod,
  getStorageSlot,
  rpcEnvelope,
  rpcRevert,
} from '../helpers/abi'
import { createMockFetch } from '../helpers/mock-fetch'

const RPC = 'https://rpc.test'
const PROXY = '0x1111111111111111111111111111111111111111'
const BEACON = '0x' + 'bc'.repeat(20)
const IMPL = '0x' + 'ab'.repeat(20)

describe('detectEip1967Beacon', () => {
  it('reads the beacon slot and resolves implementation() on the beacon', async () => {
    const fetchFn = createMockFetch([
      {
        match: (_, body) =>
          getMethod(body) === 'eth_getStorageAt'
          && getStorageSlot(body) === EIP1967_BEACON_SLOT
          && getAddressParam(body) === PROXY.toLowerCase(),
        response: { status: 200, body: rpcEnvelope(encodeAddress(BEACON)) },
      },
      {
        match: (_, body) =>
          getMethod(body) === 'eth_call'
          && getCalldata(body) === IMPLEMENTATION_SELECTOR,
        response: { status: 200, body: rpcEnvelope(encodeAddress(IMPL)) },
      },
    ])
    const result = await detectEip1967Beacon(RPC, PROXY, fetchFn)
    expect(result).toEqual({
      pattern: 'eip-1967-beacon',
      targets: [{ address: IMPL }],
      beacon: BEACON,
    })
  })

  it('returns null when the beacon slot is empty', async () => {
    const fetchFn = createMockFetch([
      {
        match: (_, body) =>
          getMethod(body) === 'eth_getStorageAt'
          && getStorageSlot(body) === EIP1967_BEACON_SLOT,
        response: { status: 200, body: rpcEnvelope(encodeAddress('0x' + '00'.repeat(20))) },
      },
    ])
    expect(await detectEip1967Beacon(RPC, PROXY, fetchFn)).toBeNull()
  })

  it('returns null when implementation() on the beacon reverts', async () => {
    const fetchFn = createMockFetch([
      {
        match: (_, body) =>
          getMethod(body) === 'eth_getStorageAt'
          && getStorageSlot(body) === EIP1967_BEACON_SLOT,
        response: { status: 200, body: rpcEnvelope(encodeAddress(BEACON)) },
      },
      {
        match: (_, body) => getMethod(body) === 'eth_call',
        response: { status: 200, body: rpcRevert() },
      },
    ])
    expect(await detectEip1967Beacon(RPC, PROXY, fetchFn)).toBeNull()
  })
})
