import { describe, it, expect } from 'vitest'
import { detectGnosisSafe } from '../../src'
import {
  encodeAddress,
  getAddressParam,
  getCalldata,
  getMethod,
  getStorageSlot,
  rpcEnvelope,
} from '../helpers/abi'
import { createMockFetch } from '../helpers/mock-fetch'

const RPC = 'https://rpc.test'
const PROXY = '0x1111111111111111111111111111111111111111'
const SINGLETON = '0x' + 'ab'.repeat(20)
const SLOT_ZERO = '0x' + '0'.repeat(64)
const MASTER_COPY_SELECTOR = '0xa619486e'
// Runtime bytecode from the SafeProxy artifact. It includes the `masterCopy()`
// selector branch and delegatecall fallback used by deployed Safe proxies.
const SAFE_PROXY_CODE = '0x608060405273ffffffffffffffffffffffffffffffffffffffff600054167fa619486e0000000000000000000000000000000000000000000000000000000060003514156050578060005260206000f35b3660008037600080366000845af43d6000803e60008114156070573d6000fd5b3d6000f3fea264697066735822122003d1488ee65e08fa41e58e888a9865554c535f2c77126a82cb4c0f917f31441364736f6c63430007060033'
const SINGLETON_CODE = '0x6001600055'

describe('detectGnosisSafe', () => {
  it('returns singleton target when slot 0 and Safe-specific behavior agree', async () => {
    const fetchFn = createMockFetch([
      {
        match: (_, body) =>
          getMethod(body) === 'eth_getStorageAt'
          && getStorageSlot(body) === SLOT_ZERO,
        response: { status: 200, body: rpcEnvelope(encodeAddress(SINGLETON)) },
      },
      {
        match: (_, body) =>
          getMethod(body) === 'eth_getCode'
          && getAddressParam(body) === PROXY,
        response: { status: 200, body: rpcEnvelope(SAFE_PROXY_CODE) },
      },
      {
        match: (_, body) =>
          getMethod(body) === 'eth_getCode'
          && getAddressParam(body) === SINGLETON,
        response: { status: 200, body: rpcEnvelope(SINGLETON_CODE) },
      },
      {
        match: (_, body) =>
          getMethod(body) === 'eth_call'
          && getCalldata(body) === MASTER_COPY_SELECTOR,
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

  it('returns null when slot 0 is an address but bytecode is not SafeProxy-shaped', async () => {
    const fetchFn = createMockFetch([
      {
        match: (_, body) =>
          getMethod(body) === 'eth_getStorageAt'
          && getStorageSlot(body) === SLOT_ZERO,
        response: { status: 200, body: rpcEnvelope(encodeAddress(SINGLETON)) },
      },
      {
        match: (_, body) =>
          getMethod(body) === 'eth_getCode'
          && getAddressParam(body) === PROXY,
        response: { status: 200, body: rpcEnvelope('0x6001600055') },
      },
      {
        match: (_, body) =>
          getMethod(body) === 'eth_getCode'
          && getAddressParam(body) === SINGLETON,
        response: { status: 200, body: rpcEnvelope(SINGLETON_CODE) },
      },
    ])
    expect(await detectGnosisSafe(RPC, PROXY, fetchFn)).toBeNull()
  })

  it('returns null when the singleton address has no code', async () => {
    const fetchFn = createMockFetch([
      {
        match: (_, body) =>
          getMethod(body) === 'eth_getStorageAt'
          && getStorageSlot(body) === SLOT_ZERO,
        response: { status: 200, body: rpcEnvelope(encodeAddress(SINGLETON)) },
      },
      {
        match: (_, body) =>
          getMethod(body) === 'eth_getCode'
          && getAddressParam(body) === PROXY,
        response: { status: 200, body: rpcEnvelope(SAFE_PROXY_CODE) },
      },
      {
        match: (_, body) =>
          getMethod(body) === 'eth_getCode'
          && getAddressParam(body) === SINGLETON,
        response: { status: 200, body: rpcEnvelope('0x') },
      },
    ])
    expect(await detectGnosisSafe(RPC, PROXY, fetchFn)).toBeNull()
  })

  it('returns null when masterCopy() disagrees with slot 0', async () => {
    const other = '0x' + 'cd'.repeat(20)
    const fetchFn = createMockFetch([
      {
        match: (_, body) =>
          getMethod(body) === 'eth_getStorageAt'
          && getStorageSlot(body) === SLOT_ZERO,
        response: { status: 200, body: rpcEnvelope(encodeAddress(SINGLETON)) },
      },
      {
        match: (_, body) =>
          getMethod(body) === 'eth_getCode'
          && getAddressParam(body) === PROXY,
        response: { status: 200, body: rpcEnvelope(SAFE_PROXY_CODE) },
      },
      {
        match: (_, body) =>
          getMethod(body) === 'eth_getCode'
          && getAddressParam(body) === SINGLETON,
        response: { status: 200, body: rpcEnvelope(SINGLETON_CODE) },
      },
      {
        match: (_, body) =>
          getMethod(body) === 'eth_call'
          && getCalldata(body) === MASTER_COPY_SELECTOR,
        response: { status: 200, body: rpcEnvelope(encodeAddress(other)) },
      },
    ])
    expect(await detectGnosisSafe(RPC, PROXY, fetchFn)).toBeNull()
  })
})
