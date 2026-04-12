// ── Patterns ──

/** Discriminator for all supported proxy patterns. */
export type ProxyPattern =
  | 'eip-2535-diamond'
  | 'eip-1967'
  | 'eip-1967-beacon'
  | 'eip-1822'
  | 'eip-1167'
  | 'gnosis-safe'
  | 'eip-897'

// ── Configuration ──

export interface ProxiesConfig {
  /**
   * Default enricher used by `fetch` when no per-call enricher is passed.
   * Receives each target address and returns whatever ABI the caller can find.
   * Leave unset to return targets with address + selectors only.
   */
  enrich?: TargetEnricher
  /** Custom fetch function. Default: `globalThis.fetch`. */
  fetch?: typeof globalThis.fetch
}

export interface FetchProxyOptions {
  /**
   * Override the client's default enricher for this call. Pass `false` to
   * disable enrichment entirely (address + selectors only).
   */
  enrich?: TargetEnricher | false
}

// ── On-chain / raw ──

/**
 * A resolved target behind a proxy — an implementation address, with optional
 * selector scope.
 *
 * - `selectors: string[]` — this target serves exactly these selectors (diamond facets).
 * - `selectors: undefined` — this target receives all calls (every other proxy pattern).
 */
export interface ResolvedTarget {
  address: string
  selectors?: string[]
}

/**
 * Raw on-chain detection result. Contains a pattern discriminator and the
 * resolved target(s). Single-impl proxies carry exactly one target; diamonds
 * carry one per facet.
 */
export interface RawProxy {
  pattern: ProxyPattern
  targets: ResolvedTarget[]
  /** EIP-1967 beacon address (only set for `eip-1967-beacon`). */
  beacon?: string
  /** EIP-1967 admin address (only set for `eip-1967` when the admin slot is non-zero). */
  admin?: string
}

// ── Enrichment ──

/**
 * User-supplied per-target enricher. Receives a target's address and returns
 * its ABI. Return `null` for unknown targets — errors are swallowed per-target
 * so one bad fetch does not fail the whole resolution.
 *
 * The package is intentionally narrow here: it only composes ABIs. For
 * richer per-target metadata, use {@link ProxiesClient.detect} and enrich
 * the raw targets yourself.
 */
export type TargetEnricher = (address: string) => Promise<TargetEnrichment | null>

export interface TargetEnrichment {
  abi?: unknown[]
}

// ── Public result shapes ──

export interface EnrichedTarget {
  address: string
  /** Selector scope for diamond facets; undefined for single-impl proxies (all selectors). */
  selectors?: string[]
  /**
   * ABI for this target. Filtered to `selectors` for diamonds; full implementation
   * ABI for single-impl proxies.
   */
  abi?: unknown[]
}

export interface Proxy {
  pattern: ProxyPattern
  targets: EnrichedTarget[]
  beacon?: string
  admin?: string
  /** Composite ABI across targets, deduped by selector (first-wins). */
  compositeAbi?: unknown[]
}

// ── Client ──

export interface ProxiesClient {
  /**
   * Detect the proxy pattern and resolve its target(s). Returns `null` if the
   * contract is not a recognised proxy.
   */
  detect: (rpc: string, address: string) => Promise<RawProxy | null>
  /**
   * Detect + enrich. Returns `null` when the contract is not a recognised proxy.
   * Uses the config-level enricher by default; override per-call via `options.enrich`.
   */
  fetch: (
    rpc: string,
    address: string,
    options?: FetchProxyOptions,
  ) => Promise<Proxy | null>
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
