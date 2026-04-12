import { describe, it, expect } from 'vitest'
import { detectAndFetchFacets } from '../src'
import { encodeBool, encodeFacets, getCalldata, rpcEnvelope } from './helpers/abi'
import { createMockFetch } from './helpers/mock-fetch'

const RPC = 'https://rpc.test'
const ADDR = '0x1111111111111111111111111111111111111111'
const FACET = '0x' + 'aa'.repeat(20)

describe('detectAndFetchFacets', () => {
  it('returns null when supportsInterface returns false', async () => {
    const fetchFn = createMockFetch([
      {
        match: (_, body) => getCalldata(body).startsWith('0x01ffc9a7'),
        response: { status: 200, body: rpcEnvelope(encodeBool(false)) },
      },
    ])
    expect(await detectAndFetchFacets(RPC, ADDR, fetchFn)).toBeNull()
  })

  it('returns facets when supportsInterface returns true', async () => {
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
    const facets = await detectAndFetchFacets(RPC, ADDR, fetchFn)
    expect(facets).toEqual([{ facetAddress: FACET, functionSelectors: ['0x18160ddd'] }])
  })

  it('falls through to facets() when supportsInterface response is malformed', async () => {
    const facetsReturn = encodeFacets([{ address: FACET, selectors: ['0x18160ddd'] }])
    const fetchFn = createMockFetch([
      {
        match: (_, body) => getCalldata(body).startsWith('0x01ffc9a7'),
        // Non-boolean high bits → parseBool returns null → fall through
        response: { status: 200, body: rpcEnvelope('0xff' + '0'.repeat(62)) },
      },
      {
        match: (_, body) => getCalldata(body).startsWith('0x7a0ed627'),
        response: { status: 200, body: rpcEnvelope(facetsReturn) },
      },
    ])
    const facets = await detectAndFetchFacets(RPC, ADDR, fetchFn)
    expect(facets).toHaveLength(1)
  })

  it('falls through to facets() when supportsInterface reverts', async () => {
    const facetsReturn = encodeFacets([{ address: FACET, selectors: ['0x18160ddd'] }])
    const fetchFn = createMockFetch([
      {
        match: (_, body) => getCalldata(body).startsWith('0x01ffc9a7'),
        // JSON-RPC error → ethCall throws → loupe catches and falls through
        response: { status: 200, body: { jsonrpc: '2.0', id: 1, error: { message: 'revert' } } },
      },
      {
        match: (_, body) => getCalldata(body).startsWith('0x7a0ed627'),
        response: { status: 200, body: rpcEnvelope(facetsReturn) },
      },
    ])
    const facets = await detectAndFetchFacets(RPC, ADDR, fetchFn)
    expect(facets).toHaveLength(1)
  })

  it('returns null when facets() reverts', async () => {
    const fetchFn = createMockFetch([
      {
        match: (_, body) => getCalldata(body).startsWith('0x01ffc9a7'),
        response: { status: 200, body: rpcEnvelope('0x' + '0'.repeat(62) + 'ff') },
      },
      {
        match: (_, body) => getCalldata(body).startsWith('0x7a0ed627'),
        response: { status: 200, body: { jsonrpc: '2.0', id: 1, error: { message: 'revert' } } },
      },
    ])
    expect(await detectAndFetchFacets(RPC, ADDR, fetchFn)).toBeNull()
  })

  it('returns null for empty facets() (all zero-address)', async () => {
    const facetsReturn = encodeFacets([
      { address: '0x' + '00'.repeat(20), selectors: ['0xdeadbeef'] },
    ])
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
    expect(await detectAndFetchFacets(RPC, ADDR, fetchFn)).toBeNull()
  })

  it('filters zero-address facets from the result', async () => {
    const facetsReturn = encodeFacets([
      { address: FACET, selectors: ['0x18160ddd'] },
      { address: '0x' + '00'.repeat(20), selectors: ['0xdeadbeef'] },
    ])
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
    const facets = await detectAndFetchFacets(RPC, ADDR, fetchFn)
    expect(facets).toHaveLength(1)
    expect(facets![0].facetAddress).toBe(FACET)
  })

  it('returns null for malformed facets() payload', async () => {
    const fetchFn = createMockFetch([
      {
        match: (_, body) => getCalldata(body).startsWith('0x01ffc9a7'),
        response: { status: 200, body: rpcEnvelope(encodeBool(true)) },
      },
      {
        match: (_, body) => getCalldata(body).startsWith('0x7a0ed627'),
        // Claims 5 facets, provides no data
        response: { status: 200, body: rpcEnvelope('0x' + '0'.repeat(62) + '20' + '0'.repeat(62) + '05') },
      },
    ])
    expect(await detectAndFetchFacets(RPC, ADDR, fetchFn)).toBeNull()
  })
})
