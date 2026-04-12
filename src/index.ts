import { buildCompositeAbi } from './abi'
import { detectProxy } from './detect'
import { enrichTargets } from './enrich'
import type {
  FetchProxyOptions,
  Proxy,
  ProxiesClient,
  ProxiesConfig,
  TargetEnricher,
} from './types'

/**
 * Create a proxy inspection client.
 *
 * ```ts
 * const proxies = createProxies()
 * const result = await proxies.fetch('https://rpc…', '0x…')
 * if (result) console.log(result.pattern, result.targets)
 * ```
 *
 * Pass `config.enrich` to populate each target's ABI from any source
 * (Sourcify, Etherscan, a local cache). Omit it to get raw targets with
 * address + (optional) selectors only.
 */
export function createProxies(config: ProxiesConfig = {}): ProxiesClient {
  const fetchFn = config.fetch ?? globalThis.fetch
  const defaultEnrich = config.enrich ?? null

  return {
    detect(rpc, address) {
      return detectProxy(rpc, address, fetchFn)
    },

    async fetch(rpc, address, options): Promise<Proxy | null> {
      const raw = await detectProxy(rpc, address, fetchFn)
      if (!raw) return null

      const enricher: TargetEnricher | null = options?.enrich === false
        ? null
        : (options?.enrich ?? defaultEnrich)

      const targets = await enrichTargets(raw.targets, enricher)

      const abiLayers = targets
        .map(t => t.abi)
        .filter((a): a is unknown[] => a !== undefined)
      const compositeAbi = abiLayers.length > 0
        ? buildCompositeAbi(abiLayers)
        : undefined

      const proxy: Proxy = { pattern: raw.pattern, targets }
      if (raw.beacon) proxy.beacon = raw.beacon
      if (raw.admin) proxy.admin = raw.admin
      if (compositeAbi) proxy.compositeAbi = compositeAbi
      return proxy
    },
  }
}

// ── Detection ──

export { detectProxy } from './detect'
export { detectDiamond } from './patterns/diamond'
export { detectEip1967 } from './patterns/eip1967'
export { detectEip1967Beacon } from './patterns/eip1967-beacon'
export { detectEip1822 } from './patterns/eip1822'
export { detectEip1167 } from './patterns/eip1167'
export { detectGnosisSafe } from './patterns/safe'
export { detectEip897 } from './patterns/eip897'

// ── Composition ──

export { enrichTargets } from './enrich'
export { filterAbiBySelectors, buildCompositeAbi } from './abi'
export { mergeNatspecDocs } from './natspec'

// ── Utilities ──

export { decodeFacets, parseAddress } from './decode'
export { computeSelector, canonicalSignature } from './selector'

// ── RPC ──

export { ethCall, ethGetStorageAt, ethGetCode } from './rpc'

// ── Constants ──

export {
  SUPPORTS_INTERFACE_SELECTOR,
  DIAMOND_LOUPE_INTERFACE_ID,
  FACETS_SELECTOR,
  IMPLEMENTATION_SELECTOR,
  EIP1967_IMPL_SLOT,
  EIP1967_BEACON_SLOT,
  EIP1967_ADMIN_SLOT,
  EIP1822_PROXIABLE_SLOT,
  EIP1167_BYTECODE_PREFIX,
  EIP1167_BYTECODE_SUFFIX,
  ZERO_ADDRESS,
} from './constants'

// ── Errors ──

export { ProxiesError, ProxiesDecodeError, ProxiesFetchError } from './errors'

// ── Types ──

export type {
  ProxiesConfig,
  ProxiesClient,
  FetchProxyOptions,
  ProxyPattern,
  ResolvedTarget,
  RawProxy,
  EnrichedTarget,
  Proxy,
  TargetEnrichment,
  TargetEnricher,
  AbiParam,
  AbiFunctionLike,
} from './types'

export type { DecodedFacet } from './decode'
