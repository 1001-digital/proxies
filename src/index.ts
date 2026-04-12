import { buildCompositeAbi } from './abi'
import { enrichFacets } from './enrich'
import { detectAndFetchFacets } from './loupe'
import type {
  Diamond,
  DiamondsClient,
  DiamondsConfig,
  FacetEnricher,
} from './types'

/**
 * Create a diamond inspection client.
 *
 * ```ts
 * const diamonds = createDiamonds()
 * const result = await diamonds.fetch('https://rpc…', '0x…')
 * if (result) console.log(result.facets)
 * ```
 *
 * Pass `config.enrich` to populate each facet's ABI from any source
 * (Sourcify, Etherscan, a local cache). Omit it to get raw facets with
 * address + selectors only.
 */
export function createDiamonds(config: DiamondsConfig = {}): DiamondsClient {
  const fetchFn = config.fetch ?? globalThis.fetch
  const defaultEnrich = config.enrich ?? null

  return {
    detect(rpc, address) {
      return detectAndFetchFacets(rpc, address, fetchFn)
    },

    async fetch(rpc, address, options): Promise<Diamond | null> {
      const raw = await detectAndFetchFacets(rpc, address, fetchFn)
      if (!raw) return null

      const enricher: FacetEnricher | null = options?.enrich === false
        ? null
        : (options?.enrich ?? defaultEnrich)

      const facets = await enrichFacets(raw, enricher)

      const abiLayers = facets
        .map(f => f.abi)
        .filter((a): a is unknown[] => a !== undefined)
      const compositeAbi = abiLayers.length > 0
        ? buildCompositeAbi(abiLayers)
        : undefined

      return compositeAbi ? { facets, compositeAbi } : { facets }
    },
  }
}

// ── Standalone primitives ──

export { detectAndFetchFacets } from './loupe'
export { enrichFacets } from './enrich'
export { decodeFacets } from './decode'
export { computeSelector, canonicalSignature } from './selector'
export { filterAbiBySelectors, buildCompositeAbi } from './abi'

// ── Constants ──

export {
  SUPPORTS_INTERFACE_SELECTOR,
  DIAMOND_LOUPE_INTERFACE_ID,
  FACETS_SELECTOR,
  ZERO_ADDRESS,
} from './constants'

// ── Errors ──

export { DiamondsError, DiamondsDecodeError } from './errors'

// ── Types ──

export type {
  DiamondsConfig,
  DiamondsClient,
  FetchDiamondOptions,
  RawFacet,
  FacetInfo,
  FacetEnrichment,
  FacetEnricher,
  Diamond,
  AbiParam,
  AbiFunctionLike,
} from './types'
