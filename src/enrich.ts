import { filterAbiBySelectors } from './abi'
import type { EnrichedTarget, ResolvedTarget, TargetEnricher } from './types'

/**
 * Apply an enricher to each resolved target, producing an `EnrichedTarget[]`.
 *
 * Enricher errors are swallowed per-target — one bad fetch does not fail the
 * whole resolution. Pass `null` to skip enrichment entirely (targets will
 * carry only `address` + `selectors`).
 *
 * When a target has `selectors` defined (diamond facets), the returned ABI is
 * filtered to those selectors. When `selectors` is undefined (any single-impl
 * proxy pattern), the full implementation ABI is passed through untouched.
 */
export async function enrichTargets(
  targets: ResolvedTarget[],
  enrich: TargetEnricher | null,
): Promise<EnrichedTarget[]> {
  const enrichments = enrich
    ? await Promise.all(
        targets.map(t => enrich(t.address).catch(() => null)),
      )
    : targets.map(() => null)

  return targets.map((t, i) => {
    const src = enrichments[i]
    const info: EnrichedTarget = { address: t.address }
    if (t.selectors !== undefined) info.selectors = t.selectors
    if (src?.abi) {
      info.abi = t.selectors !== undefined
        ? filterAbiBySelectors(src.abi, t.selectors)
        : src.abi
    }
    return info
  })
}
