import { describe, it, expect, vi } from 'vitest'
import {
  createProxies,
  DIAMOND_LOUPE_INTERFACE_ID,
  EIP1967_ADMIN_SLOT,
  EIP1967_IMPL_SLOT,
  FACETS_SELECTOR,
  SUPPORTS_INTERFACE_SELECTOR,
  ZERO_ADDRESS,
} from '../src'
import {
  encodeAddress,
  encodeBool,
  encodeFacets,
  getCalldata,
  getMethod,
  getStorageSlot,
  rpcEnvelope,
} from './helpers/abi'
import { createMockFetch } from './helpers/mock-fetch'

const RPC = 'https://rpc.test'
const ADDR = '0x1111111111111111111111111111111111111111'
const FACET = '0x' + 'aa'.repeat(20)
const IMPL = '0x' + 'cc'.repeat(20)

describe('constants', () => {
  it('exposes the canonical ERC-2535 / ERC-165 selectors', () => {
    expect(FACETS_SELECTOR).toBe('0x7a0ed627')
    expect(SUPPORTS_INTERFACE_SELECTOR).toBe('0x01ffc9a7')
    expect(DIAMOND_LOUPE_INTERFACE_ID).toBe('0x48e2b093')
    expect(ZERO_ADDRESS).toBe('0x' + '0'.repeat(40))
  })
})

describe('createProxies', () => {
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

  function setup1967Fetch() {
    return createMockFetch([
      {
        match: (_, body) => getCalldata(body).startsWith(SUPPORTS_INTERFACE_SELECTOR),
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
  }

  it('detect returns null for non-proxies', async () => {
    const fetchFn = createMockFetch([
      {
        match: (_, body) => getCalldata(body).startsWith(SUPPORTS_INTERFACE_SELECTOR),
        response: { status: 200, body: rpcEnvelope(encodeBool(false)) },
      },
      {
        match: (_, body) => getMethod(body) === 'eth_getStorageAt',
        response: { status: 200, body: rpcEnvelope(encodeAddress('0x' + '00'.repeat(20))) },
      },
      {
        match: (_, body) => getMethod(body) === 'eth_getCode',
        response: { status: 200, body: rpcEnvelope('0x') },
      },
    ])
    const proxies = createProxies({ fetch: fetchFn })
    expect(await proxies.detect(RPC, ADDR)).toBeNull()
  })

  it('detect returns a RawProxy for diamonds', async () => {
    const proxies = createProxies({ fetch: setupDiamondFetch() })
    const raw = await proxies.detect(RPC, ADDR)
    expect(raw?.pattern).toBe('eip-2535-diamond')
    expect(raw?.targets).toEqual([{ address: FACET, selectors: ['0x18160ddd'] }])
  })

  it('detect returns a RawProxy for 1967 proxies', async () => {
    const proxies = createProxies({ fetch: setup1967Fetch() })
    const raw = await proxies.detect(RPC, ADDR)
    expect(raw?.pattern).toBe('eip-1967')
    expect(raw?.targets).toEqual([{ address: IMPL }])
  })

  it('fetch without an enricher returns address+selectors only (diamond)', async () => {
    const proxies = createProxies({ fetch: setupDiamondFetch() })
    const result = await proxies.fetch(RPC, ADDR)
    expect(result).toEqual({
      pattern: 'eip-2535-diamond',
      targets: [{ address: FACET, selectors: ['0x18160ddd'] }],
    })
  })

  it('fetch uses the config-level enricher by default (diamond)', async () => {
    const enrich = vi.fn(async () => ({
      abi: [{ type: 'function', name: 'totalSupply', inputs: [] }],
    }))
    const proxies = createProxies({ fetch: setupDiamondFetch(), enrich })
    const result = await proxies.fetch(RPC, ADDR)
    expect(enrich).toHaveBeenCalledWith(FACET)
    expect(result!.targets[0].abi).toHaveLength(1)
    expect(result!.compositeAbi).toHaveLength(1)
  })

  it('fetch passes the full ABI through for a plain proxy (no selector filter)', async () => {
    const enrich = vi.fn(async () => ({
      abi: [
        { type: 'function', name: 'totalSupply', inputs: [] },
        { type: 'function', name: 'balanceOf', inputs: [{ type: 'address' }] },
      ],
    }))
    const proxies = createProxies({ fetch: setup1967Fetch(), enrich })
    const result = await proxies.fetch(RPC, ADDR)
    expect(enrich).toHaveBeenCalledWith(IMPL)
    expect(result!.pattern).toBe('eip-1967')
    expect(result!.targets[0].selectors).toBeUndefined()
    expect(result!.targets[0].abi).toHaveLength(2)
    expect(result!.compositeAbi).toHaveLength(2)
  })

  it('per-call enrich overrides the config default', async () => {
    const configEnrich = vi.fn(async () => ({ abi: [{ type: 'fallback' }] }))
    const callEnrich = vi.fn(async () => ({
      abi: [{ type: 'function', name: 'totalSupply', inputs: [] }],
    }))
    const proxies = createProxies({ fetch: setupDiamondFetch(), enrich: configEnrich })
    const result = await proxies.fetch(RPC, ADDR, { enrich: callEnrich })
    expect(configEnrich).not.toHaveBeenCalled()
    expect(callEnrich).toHaveBeenCalledWith(FACET)
    expect((result!.targets[0].abi as any)[0].name).toBe('totalSupply')
  })

  it('enrich: false disables a config-level enricher for one call', async () => {
    const configEnrich = vi.fn(async () => ({ abi: [{ type: 'fallback' }] }))
    const proxies = createProxies({ fetch: setupDiamondFetch(), enrich: configEnrich })
    const result = await proxies.fetch(RPC, ADDR, { enrich: false })
    expect(configEnrich).not.toHaveBeenCalled()
    expect(result!.targets[0].abi).toBeUndefined()
    expect(result!.compositeAbi).toBeUndefined()
  })
})
