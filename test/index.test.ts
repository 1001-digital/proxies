import { describe, it, expect, vi } from 'vitest'
import {
  createDiamonds,
  DIAMOND_LOUPE_INTERFACE_ID,
  SUPPORTS_INTERFACE_SELECTOR,
  FACETS_SELECTOR,
  ZERO_ADDRESS,
} from '../src'
import { encodeBool, encodeFacets, getCalldata, rpcEnvelope } from './helpers/abi'
import { createMockFetch } from './helpers/mock-fetch'

const RPC = 'https://rpc.test'
const ADDR = '0x1111111111111111111111111111111111111111'
const FACET = '0x' + 'aa'.repeat(20)

describe('constants', () => {
  it('exposes the canonical ERC-2535 / ERC-165 selectors', () => {
    expect(FACETS_SELECTOR).toBe('0x7a0ed627')
    expect(SUPPORTS_INTERFACE_SELECTOR).toBe('0x01ffc9a7')
    expect(DIAMOND_LOUPE_INTERFACE_ID).toBe('0x48e2b093')
    expect(ZERO_ADDRESS).toBe('0x' + '0'.repeat(40))
  })
})

describe('createDiamonds', () => {
  function setupDiamondFetch(extraRoutes: Parameters<typeof createMockFetch>[0] = []) {
    const facetsReturn = encodeFacets([{ address: FACET, selectors: ['0x18160ddd'] }])
    return createMockFetch([
      ...extraRoutes,
      {
        match: (_, body) => getCalldata(body).startsWith(SUPPORTS_INTERFACE_SELECTOR),
        response: { status: 200, body: rpcEnvelope(encodeBool(true)) },
      },
      {
        match: (_, body) => getCalldata(body).startsWith(FACETS_SELECTOR),
        response: { status: 200, body: rpcEnvelope(facetsReturn) },
      },
    ])
  }

  it('detect returns null for non-diamonds', async () => {
    const fetchFn = createMockFetch([
      {
        match: (_, body) => getCalldata(body).startsWith(SUPPORTS_INTERFACE_SELECTOR),
        response: { status: 200, body: rpcEnvelope(encodeBool(false)) },
      },
    ])
    const diamonds = createDiamonds({ fetch: fetchFn })
    expect(await diamonds.detect(RPC, ADDR)).toBeNull()
  })

  it('detect returns raw facets for diamonds', async () => {
    const diamonds = createDiamonds({ fetch: setupDiamondFetch() })
    const facets = await diamonds.detect(RPC, ADDR)
    expect(facets).toEqual([{ facetAddress: FACET, functionSelectors: ['0x18160ddd'] }])
  })

  it('fetch returns null for non-diamonds', async () => {
    const fetchFn = createMockFetch([
      {
        match: (_, body) => getCalldata(body).startsWith(SUPPORTS_INTERFACE_SELECTOR),
        response: { status: 200, body: rpcEnvelope(encodeBool(false)) },
      },
    ])
    const diamonds = createDiamonds({ fetch: fetchFn })
    expect(await diamonds.fetch(RPC, ADDR)).toBeNull()
  })

  it('fetch without an enricher returns address+selectors only', async () => {
    const diamonds = createDiamonds({ fetch: setupDiamondFetch() })
    const result = await diamonds.fetch(RPC, ADDR)
    expect(result).toEqual({
      facets: [{ address: FACET, selectors: ['0x18160ddd'] }],
    })
  })

  it('uses the config-level enricher by default', async () => {
    const enrich = vi.fn(async () => ({
      abi: [{ type: 'function', name: 'totalSupply', inputs: [] }],
    }))
    const diamonds = createDiamonds({ fetch: setupDiamondFetch(), enrich })
    const result = await diamonds.fetch(RPC, ADDR)
    expect(enrich).toHaveBeenCalledWith(FACET)
    expect(result!.facets[0].abi).toHaveLength(1)
    expect(result!.compositeAbi).toHaveLength(1)
  })

  it('per-call enrich overrides the config default', async () => {
    const configEnrich = vi.fn(async () => ({ abi: [{ type: 'fallback' }] }))
    const callEnrich = vi.fn(async () => ({
      abi: [{ type: 'function', name: 'totalSupply', inputs: [] }],
    }))
    const diamonds = createDiamonds({ fetch: setupDiamondFetch(), enrich: configEnrich })
    const result = await diamonds.fetch(RPC, ADDR, { enrich: callEnrich })
    expect(configEnrich).not.toHaveBeenCalled()
    expect(callEnrich).toHaveBeenCalledWith(FACET)
    expect((result!.facets[0].abi as any)[0].name).toBe('totalSupply')
  })

  it('enrich: false disables a config-level enricher for one call', async () => {
    const configEnrich = vi.fn(async () => ({ abi: [{ type: 'fallback' }] }))
    const diamonds = createDiamonds({ fetch: setupDiamondFetch(), enrich: configEnrich })
    const result = await diamonds.fetch(RPC, ADDR, { enrich: false })
    expect(configEnrich).not.toHaveBeenCalled()
    expect(result!.facets[0].abi).toBeUndefined()
    expect(result!.compositeAbi).toBeUndefined()
  })
})
