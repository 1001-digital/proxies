# @1001-digital/proxies

## 0.2.1

### Patch Changes

- [#7](https://github.com/1001-digital/proxies/pull/7) [`d879fa6`](https://github.com/1001-digital/proxies/commit/d879fa68928960c23a03b484c70ab0adbb2e35f8) Thanks [@0xAkuti](https://github.com/0xAkuti)! - `detectEip1167` now matches clones with immutable args appended after the 45-byte runtime (OpenZeppelin `Clones.cloneWithImmutableArgs`). Previously the exact-length check rejected them.

## 0.2.0

### Minor Changes

- [#5](https://github.com/1001-digital/proxies/pull/5) [`1fcc552`](https://github.com/1001-digital/proxies/commit/1fcc5528fc92a750abd6a04468da03a19a558466) Thanks [@jwahdatehagh](https://github.com/jwahdatehagh)! - Add `zeppelinos` pattern — legacy ZeppelinOS (pre-EIP-1967) upgradeable proxies.

  `detectZeppelinOs` reads the implementation from `keccak256('org.zeppelinos.proxy.implementation')` (`0x7050…f8c3`) and attaches the admin from `keccak256('org.zeppelinos.proxy.admin')` when set. Wired into `detectProxy` between `eip-1822` and `eip-1167`.

  These proxies predate EIP-1967's decremented-slot scheme and were previously undetectable: the EIP-1967 slots are empty, and `implementation()` sits behind an `ifAdmin` modifier, so the EIP-897 probe reverts for any non-admin caller. The most prominent deployment still on this layout is Circle's USDC (`FiatTokenProxy`, `0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48`), which now resolves to its `FiatTokenV2_2` implementation.

  New exports: `detectZeppelinOs`, `ZEPPELINOS_IMPL_SLOT`, `ZEPPELINOS_ADMIN_SLOT`.

## 0.1.1

### Patch Changes

- [#3](https://github.com/1001-digital/proxies/pull/3) [`7ce944b`](https://github.com/1001-digital/proxies/commit/7ce944b99864314a2e1305904b56d83b82de8d40) Thanks [@yougogirldoteth](https://github.com/yougogirldoteth)! - Tighten Gnosis Safe detection to avoid false positives from arbitrary slot-0

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
