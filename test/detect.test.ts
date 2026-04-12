import { describe, it, expect } from 'vitest'
import {
  detectProxy,
  EIP1967_ADMIN_SLOT,
  EIP1967_BEACON_SLOT,
  EIP1967_IMPL_SLOT,
  IMPLEMENTATION_SELECTOR,
} from '../src'
import {
  encodeAddress,
  encodeBool,
  encodeEip1167Bytecode,
  encodeFacets,
  getCalldata,
  getMethod,
  getStorageSlot,
  rpcEnvelope,
  rpcRevert,
} from './helpers/abi'
import { createMockFetch } from './helpers/mock-fetch'

const RPC = 'https://rpc.test'
const ADDR = '0x1111111111111111111111111111111111111111'
const IMPL = '0x' + 'ab'.repeat(20)
const FACET = '0x' + 'cd'.repeat(20)
const BEACON = '0x' + 'be'.repeat(20)

describe('detectProxy', () => {
  it('returns null for a regular (non-proxy) contract', async () => {
    const fetchFn = createMockFetch([
      {
        match: (_, body) => getCalldata(body).startsWith('0x01ffc9a7'),
        response: { status: 200, body: rpcEnvelope(encodeBool(false)) },
      },
      // All storage reads → zero
      {
        match: (_, body) => getMethod(body) === 'eth_getStorageAt',
        response: { status: 200, body: rpcEnvelope(encodeAddress('0x' + '00'.repeat(20))) },
      },
      // eth_getCode → arbitrary non-1167 bytecode
      {
        match: (_, body) => getMethod(body) === 'eth_getCode',
        response: { status: 200, body: rpcEnvelope('0x6080604052' + '00'.repeat(100)) },
      },
      // implementation() → revert
      {
        match: (_, body) =>
          getMethod(body) === 'eth_call'
          && getCalldata(body) === IMPLEMENTATION_SELECTOR,
        response: { status: 200, body: rpcRevert() },
      },
    ])
    expect(await detectProxy(RPC, ADDR, fetchFn)).toBeNull()
  })

  it('returns diamond match ahead of other patterns', async () => {
    const facetsReturn = encodeFacets([{ address: FACET, selectors: ['0x18160ddd'] }])
    const fetchFn = createMockFetch([
      {
        match: (_, body) => getCalldata(body).startsWith('0x01ffc9a7'),
        response: { status: 200, body: rpcEnvelope(encodeBool(true)) },
      },
      {
        match: (_, body) => getCalldata(body).startsWith('0x7a0ed627'),
        response: { status: 200, body: rpcEnvelope(facetsReturn) },
      },
    ])
    const result = await detectProxy(RPC, ADDR, fetchFn)
    expect(result?.pattern).toBe('eip-2535-diamond')
  })

  it('returns 1967 impl when diamond probe fails and impl slot is set', async () => {
    const fetchFn = createMockFetch([
      {
        match: (_, body) => getCalldata(body).startsWith('0x01ffc9a7'),
        response: { status: 200, body: rpcEnvelope(encodeBool(false)) },
      },
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
    const result = await detectProxy(RPC, ADDR, fetchFn)
    expect(result).toEqual({
      pattern: 'eip-1967',
      targets: [{ address: IMPL }],
    })
  })

  it('falls back to 1967-beacon when the impl slot is empty but the beacon slot is set', async () => {
    const fetchFn = createMockFetch([
      {
        match: (_, body) => getCalldata(body).startsWith('0x01ffc9a7'),
        response: { status: 200, body: rpcEnvelope(encodeBool(false)) },
      },
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
      {
        match: (_, body) =>
          getMethod(body) === 'eth_getStorageAt'
          && getStorageSlot(body) === EIP1967_BEACON_SLOT,
        response: { status: 200, body: rpcEnvelope(encodeAddress(BEACON)) },
      },
      {
        match: (_, body) =>
          getMethod(body) === 'eth_call'
          && getCalldata(body) === IMPLEMENTATION_SELECTOR,
        response: { status: 200, body: rpcEnvelope(encodeAddress(IMPL)) },
      },
    ])
    const result = await detectProxy(RPC, ADDR, fetchFn)
    expect(result?.pattern).toBe('eip-1967-beacon')
    expect(result?.beacon).toBe(BEACON)
    expect(result?.targets[0].address).toBe(IMPL)
  })

  it('falls back to 1167 when no storage slot matches', async () => {
    const fetchFn = createMockFetch([
      {
        match: (_, body) => getCalldata(body).startsWith('0x01ffc9a7'),
        response: { status: 200, body: rpcEnvelope(encodeBool(false)) },
      },
      {
        match: (_, body) => getMethod(body) === 'eth_getStorageAt',
        response: { status: 200, body: rpcEnvelope(encodeAddress('0x' + '00'.repeat(20))) },
      },
      {
        match: (_, body) => getMethod(body) === 'eth_getCode',
        response: { status: 200, body: rpcEnvelope(encodeEip1167Bytecode(IMPL)) },
      },
    ])
    const result = await detectProxy(RPC, ADDR, fetchFn)
    expect(result?.pattern).toBe('eip-1167')
    expect(result?.targets[0].address).toBe(IMPL)
  })
})
