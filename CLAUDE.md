# CLAUDE.md

Diamonds SDK (`@1001-digital/diamonds`) — ERC-2535 Diamond inspection primitives.

## Code style

- TypeScript
- Single quotes, no semicolons

## Structure

- `src/` — Source code
- `src/index.ts` — Factory (`createDiamonds`) + barrel exports
- `src/types.ts` — Public types (config, client, raw/enriched facets)
- `src/errors.ts` — Error classes (`DiamondsError`, `DiamondsDecodeError`; `DiamondsFetchError` is internal)
- `src/constants.ts` — ERC-2535 / ERC-165 selectors and interface IDs
- `src/selector.ts` — Pure: `computeSelector`, `canonicalSignature`
- `src/decode.ts` — Pure: `decodeFacets` (ABI-decoder for the loupe return), `parseBool` (internal)
- `src/abi.ts` — Pure: `filterAbiBySelectors`, `buildCompositeAbi`
- `src/rpc.ts` — Internal: minimal `eth_call` helper
- `src/loupe.ts` — `detectAndFetchFacets` (ERC-165 probe → `facets()` probe)
- `src/enrich.ts` — `enrichFacets` (generic — enricher is user-supplied, returns `{ abi? }`)
- `test/` — Vitest tests (mirrors src structure)

## Key patterns

- Vite build step — outputs JS + `.d.ts` to `dist/`, source TS published alongside for editor navigation
- Factory pattern — `createDiamonds(config?)` returns a `DiamondsClient` with `detect`, `fetch`
- Pure functions — all decoders, selector math, and ABI utilities are stateless and exported directly
- **Narrow scope** — the package composes ABIs; it takes no opinion on documentation formats (NatSpec, etc.) or richer per-facet metadata shapes. Consumers wanting those use `detect()` and own the enrichment step.
- Dependency injection for enrichment — the caller supplies an `FacetEnricher` (Sourcify, Etherscan, local files, nothing); the package just threads it through
- Minimal runtime dependencies — only `@noble/hashes` (for keccak_256)

## Public API surface

Exported from `src/index.ts`:

- Factory: `createDiamonds`
- Standalone: `detectAndFetchFacets`, `enrichFacets`, `decodeFacets`, `computeSelector`, `canonicalSignature`, `filterAbiBySelectors`, `buildCompositeAbi`
- Constants: `SUPPORTS_INTERFACE_SELECTOR`, `DIAMOND_LOUPE_INTERFACE_ID`, `FACETS_SELECTOR`, `ZERO_ADDRESS`
- Errors: `DiamondsError`, `DiamondsDecodeError`
- Types: `DiamondsConfig`, `DiamondsClient`, `FetchDiamondOptions`, `RawFacet`, `FacetInfo`, `FacetEnrichment`, `FacetEnricher`, `Diamond`, `AbiParam`, `AbiFunctionLike`

Deliberately internal (used internally but not exported): `parseBool`, `ethCall`, `DiamondsFetchError`.

## Testing

Tests mock `globalThis.fetch` — no real network calls. `test/helpers/abi.ts` builds
ABI-encoded hex payloads; `test/helpers/mock-fetch.ts` routes requests via URL/body matchers.
