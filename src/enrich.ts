import { filterAbiBySelectors } from './abi'
import type { FacetEnricher, FacetInfo, RawFacet } from './types'

/**
 * Apply an enricher to each raw facet, producing a `FacetInfo[]`.
 *
 * Enricher errors are swallowed per-facet — one bad fetch does not fail the
 * whole diamond. Pass `null` to skip enrichment entirely (facets will carry
 * only `address` + `selectors`).
 *
 * The returned ABIs are filtered to the selectors actually mounted on each
 * facet; a verified facet that declares extra functions won't leak them.
 */
export async function enrichFacets(
  rawFacets: RawFacet[],
  enrich: FacetEnricher | null,
): Promise<FacetInfo[]> {
  const enrichments = enrich
    ? await Promise.all(
        rawFacets.map(rf => enrich(rf.facetAddress).catch(() => null)),
      )
    : rawFacets.map(() => null)

  return rawFacets.map((rf, i) => {
    const src = enrichments[i]
    const info: FacetInfo = {
      address: rf.facetAddress,
      selectors: rf.functionSelectors,
    }
    if (src?.abi) info.abi = filterAbiBySelectors(src.abi, rf.functionSelectors)
    return info
  })
}
