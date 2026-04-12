# @1001-digital/diamonds

## 0.1.0

### Minor Changes

- [`456c2e2`](https://github.com/1001-digital/diamonds/commit/456c2e2da9b2f6732179986717d94981c4e429b2) Thanks [@jwahdatehagh](https://github.com/jwahdatehagh)! - Initial release of `@1001-digital/diamonds` — ERC-2535 Diamond inspection primitives.

  ### Features

  - **`createDiamonds(config?)`** — factory returning a client with `detect` and `fetch`.
  - **`detectAndFetchFacets`** — ERC-165 probe that falls back to a direct `facets()` call; filters zero-address (deleted) entries.
  - **`enrichFacets`** — dependency-injected per-facet ABI enricher (Sourcify, Etherscan, local cache, or nothing); per-facet errors are swallowed.
  - **`decodeFacets`** — pure ABI decoder for the loupe return value, with sanity limits (200 facets / 1000 selectors per facet).
  - **`computeSelector` / `canonicalSignature`** — pure keccak-based selector math with full tuple expansion.
  - **`filterAbiBySelectors` / `buildCompositeAbi`** — pure ABI helpers with first-wins selector dedup.
  - **Narrow scope** — composes ABIs; no opinion on documentation formats or richer per-facet metadata. Use `detect()` + your own enrichment for anything beyond ABI.
  - **Minimal runtime dependencies** — only `@noble/hashes`.
