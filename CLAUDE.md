# CLAUDE.md

Proxies SDK (`@1001-digital/proxies`) — Ethereum proxy pattern detection primitives. Covers ERC-2535 diamonds, EIP-1967 (transparent/UUPS + beacon), EIP-1822, EIP-1167 clones, Gnosis Safe, and EIP-897.

Note: the directory is still named `diamonds/` but the package is now `@1001-digital/proxies`. A diamond is one `pattern` value among many.

## Code style

- TypeScript
- Single quotes, no semicolons

## Structure

- `src/` — Source code
- `src/index.ts` — Factory (`createProxies`) + barrel exports
- `src/types.ts` — Public types (config, client, `ProxyPattern`, `RawProxy`, `ResolvedTarget`, `EnrichedTarget`, `Proxy`)
- `src/errors.ts` — Error classes (`ProxiesError`, `ProxiesDecodeError`, `ProxiesFetchError`)
- `src/constants.ts` — ERC-2535 / ERC-165 selectors, EIP-1967 / EIP-1822 storage slots, EIP-1167 bytecode markers
- `src/selector.ts` — Pure: `computeSelector`, `canonicalSignature`
- `src/decode.ts` — Pure: `decodeFacets` (loupe return decoder), `parseBool` (internal)
- `src/abi.ts` — Pure: `filterAbiBySelectors`, `buildCompositeAbi`
- `src/rpc.ts` — Minimal JSON-RPC helpers: `ethCall`, `ethGetStorageAt`, `ethGetCode`
- `src/patterns/` — Per-pattern detectors, each returns `RawProxy | null`
- `src/detect.ts` — `detectProxy` orchestrator (tries patterns in priority order)
- `src/enrich.ts` — `enrichTargets` (generic — enricher is user-supplied, returns `{ abi? }`)
- `test/` — Vitest tests (mirrors src structure)

## Key patterns

- Vite build step — outputs JS + `.d.ts` to `dist/`, source TS published alongside for editor navigation
- Factory pattern — `createProxies(config?)` returns a `ProxiesClient` with `detect`, `fetch`
- Pure functions — all decoders, selector math, and ABI/NatSpec utilities are stateless and exported directly
- **Uniform pipeline** — `detectProxy → enrichTargets → compose`. A diamond is N targets with selector scopes; every other pattern is 1 target with `selectors: undefined` (meaning "all selectors").
- **Narrow scope** — the package composes ABIs; it takes no opinion on richer per-target metadata shapes (documentation formats, sources, verification status, …). Consumers wanting those use `detect()` and own the enrichment step.
- Dependency injection for enrichment — the caller supplies a `TargetEnricher` (Sourcify, Etherscan, local files, nothing); the package just threads it through
- Single-hop — if a resolved implementation is itself a proxy, detection does not recurse. Beacon stays supported as a defined two-step pattern.
- Minimal runtime dependencies — only `@noble/hashes` (for keccak_256)

## Detector priority

`detectProxy` tries: `eip-2535-diamond → eip-1967 → eip-1967-beacon → eip-1822 → eip-1167 → gnosis-safe → eip-897`. First match wins. Each detector runs with error isolation — one failing RPC call does not poison the probe.

## Public API surface

Exported from `src/index.ts`:

- Factory: `createProxies`
- Detection: `detectProxy`, `detectDiamond`, `detectEip1967`, `detectEip1967Beacon`, `detectEip1822`, `detectEip1167`, `detectGnosisSafe`, `detectEip897`
- Composition: `enrichTargets`, `buildCompositeAbi`
- Utilities: `decodeFacets`, `computeSelector`, `canonicalSignature`, `filterAbiBySelectors`
- RPC: `ethCall`, `ethGetStorageAt`, `ethGetCode`
- Constants: `SUPPORTS_INTERFACE_SELECTOR`, `DIAMOND_LOUPE_INTERFACE_ID`, `FACETS_SELECTOR`, `IMPLEMENTATION_SELECTOR`, `EIP1967_IMPL_SLOT`, `EIP1967_BEACON_SLOT`, `EIP1967_ADMIN_SLOT`, `EIP1822_PROXIABLE_SLOT`, `EIP1167_BYTECODE_PREFIX`, `EIP1167_BYTECODE_SUFFIX`, `ZERO_ADDRESS`
- Errors: `ProxiesError`, `ProxiesDecodeError`, `ProxiesFetchError`
- Types: `ProxiesConfig`, `ProxiesClient`, `FetchProxyOptions`, `ProxyPattern`, `ResolvedTarget`, `RawProxy`, `EnrichedTarget`, `Proxy`, `TargetEnrichment`, `TargetEnricher`, `AbiParam`, `AbiFunctionLike`

Deliberately internal (used internally but not exported): `parseBool`.

## Testing

Tests mock `globalThis.fetch` — no real network calls. `test/helpers/abi.ts` builds
ABI-encoded hex payloads and storage-slot fixtures; `test/helpers/mock-fetch.ts` routes requests via URL/body matchers.
