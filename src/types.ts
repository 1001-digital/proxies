// ── Configuration ──

export interface DiamondsConfig {
  /**
   * Default enricher used by `fetch` when no per-call enricher is passed.
   * Receives each facet address and returns whatever ABI the caller can find.
   * Leave unset to return facets with address + selectors only.
   */
  enrich?: FacetEnricher
  /** Custom fetch function. Default: `globalThis.fetch`. */
  fetch?: typeof globalThis.fetch
}

export interface FetchDiamondOptions {
  /**
   * Override the client's default enricher for this call. Pass `false` to
   * disable enrichment entirely (address + selectors only).
   */
  enrich?: FacetEnricher | false
}

// ── On-chain / raw ──

/** Raw on-chain `facets()` entry — address plus the selectors it serves. */
export interface RawFacet {
  facetAddress: string
  functionSelectors: string[]
}

// ── Enrichment ──

/**
 * User-supplied per-facet enricher. Receives a facet's address and returns
 * its ABI. Return `null` for unknown facets — errors are swallowed per-facet
 * so one bad fetch does not fail the whole diamond.
 *
 * The package is intentionally narrow here: it only composes ABIs. For
 * richer per-facet metadata, use {@link DiamondsClient.detect} and enrich
 * the raw facets yourself.
 */
export type FacetEnricher = (address: string) => Promise<FacetEnrichment | null>

export interface FacetEnrichment {
  abi?: unknown[]
}

// ── Public result shapes ──

export interface FacetInfo {
  address: string
  selectors: string[]
  /** ABI filtered to the selectors actually mounted on this facet. */
  abi?: unknown[]
}

export interface Diamond {
  facets: FacetInfo[]
  /** Composite ABI across facets, deduped by selector (first-wins). */
  compositeAbi?: unknown[]
}

// ── Client ──

export interface DiamondsClient {
  /** Return live facets from `facets()`, or `null` if the contract is not a diamond. */
  detect: (rpc: string, address: string) => Promise<RawFacet[] | null>
  /**
   * Detect + enrich. Returns `null` when the contract is not a diamond.
   * Uses the config-level enricher by default; override per-call via `options.enrich`.
   */
  fetch: (
    rpc: string,
    address: string,
    options?: FetchDiamondOptions,
  ) => Promise<Diamond | null>
}

// ── ABI shape helpers (structural) ──

export interface AbiParam {
  type: string
  components?: AbiParam[]
}

export interface AbiFunctionLike {
  type: string
  name?: string
  inputs?: AbiParam[]
}
