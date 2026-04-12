# @1001-digital/proxies

## 0.1.0

### Minor Changes

- [`cc38648`](https://github.com/1001-digital/proxies/commit/cc386483cc68acfa7fc91ce9fd95b5d29621d755) Thanks [@jwahdatehagh](https://github.com/jwahdatehagh)! - Initial release — Ethereum proxy pattern detection primitives for TypeScript.

  Given a contract address, resolve where the real code lives: one implementation (plain proxy) or N facets (diamond). All patterns flow through the same `detect → enrich → compose` pipeline.

  Supported patterns, tried in priority order by `detectProxy`:

  - ERC-2535 diamond (loupe)
  - EIP-1967 (transparent / UUPS)
  - EIP-1967 beacon
  - EIP-1822 (UUPS)
  - EIP-1167 minimal proxy (clone)
  - Gnosis Safe
  - EIP-897

  Public API:

  - `createProxies(config?)` factory returning a `ProxiesClient` (`detect`, `fetch`)
  - Per-pattern detectors exported individually (`detectDiamond`, `detectEip1967`, `detectEip1967Beacon`, `detectEip1822`, `detectEip1167`, `detectGnosisSafe`, `detectEip897`)
  - Composition utilities: `enrichTargets`, `buildCompositeAbi`, `filterAbiBySelectors`
  - Pure helpers: `computeSelector`, `canonicalSignature`, `decodeFacets`
  - JSON-RPC helpers: `ethCall`, `ethGetStorageAt`, `ethGetCode`
  - Typed errors: `ProxiesError`, `ProxiesDecodeError`, `ProxiesFetchError`

  Enrichment is dependency-injected — consumers supply a `TargetEnricher` returning `{ abi? }` per target (Sourcify, Etherscan, local files, …). The package stays narrow and takes no opinion on richer per-target metadata (sources, documentation, verification).

  Detection is single-hop: if a resolved implementation is itself a proxy, detection does not recurse. Beacon remains supported as a defined two-step pattern.
