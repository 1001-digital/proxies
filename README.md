# @1001-digital/proxies

Ethereum proxy pattern detection primitives for TypeScript — ERC-2535 diamonds, EIP-1967, EIP-1167, beacon, Safe, EIP-1822, EIP-897.

Given a contract address, resolve where the real code lives: one implementation (plain proxy) or N facets (diamond). Uniform detect → enrich → compose pipeline across all patterns.

Narrow on purpose: this package knows proxy conventions, selectors, and ABIs. Anything richer — Sourcify, NatSpec, repository metadata — is the consumer's concern. Bring your own enricher.

## Install

```bash
pnpm add @1001-digital/proxies
```

## Usage

### Detect + fetch a proxy

```ts
import { createProxies } from '@1001-digital/proxies'

const proxies = createProxies()

const result = await proxies.fetch(
  'https://eth.llamarpc.com',
  '0xProxyAddress…',
)

if (result) {
  console.log(result.pattern)        // 'eip-1967' | 'eip-2535-diamond' | …
  console.log(result.targets)        // [{ address, selectors?, abi? }, …]
  console.log(result.compositeAbi)   // undefined — no enricher configured
}
```

### Enrich with Sourcify (or anything else)

The enricher returns each target's ABI. Anything richer (sources, bytecode,
documentation, …) is the consumer's concern — see *Detect and do your own
enrichment* below.

```ts
import { createProxies } from '@1001-digital/proxies'

async function sourcifyAbi(address: string) {
  const res = await fetch(
    `https://sourcify.dev/server/v2/contract/1/${address}?fields=abi`,
  )
  if (!res.ok) return null
  const { abi } = await res.json()
  return { abi }
}

const proxies = createProxies({ enrich: sourcifyAbi })

const result = await proxies.fetch(
  'https://eth.llamarpc.com',
  '0xProxyAddress…',
)

if (result) {
  console.log(result.targets[0].abi) // ABI (filtered to selectors for diamonds, full for plain proxies)
  console.log(result.compositeAbi)   // all target ABIs deduped by selector
}
```

### Detect and do your own enrichment

For richer per-target metadata, use `detect` and own the enrichment step
end-to-end. `filterAbiBySelectors` and `buildCompositeAbi` remain useful
primitives.

```ts
import {
  createProxies,
  filterAbiBySelectors,
  buildCompositeAbi,
} from '@1001-digital/proxies'

const proxies = createProxies()
const raw = await proxies.detect(rpc, address)

if (raw) {
  const enriched = await Promise.all(raw.targets.map(async t => {
    const src = await mySource(t.address)
    return {
      ...t,
      abi: src?.abi && t.selectors
        ? filterAbiBySelectors(src.abi, t.selectors)
        : src?.abi,
      metadata: src?.metadata,
    }
  }))

  const compositeAbi = buildCompositeAbi(
    enriched.map(t => t.abi).filter((a): a is unknown[] => !!a),
  )
}
```

### Standalone primitives

All low-level utilities are exported directly — use them without the factory:

```ts
import {
  detectProxy,
  detectDiamond,
  detectEip1967,
  decodeFacets,
  computeSelector,
  canonicalSignature,
  filterAbiBySelectors,
  buildCompositeAbi,
  enrichTargets,
} from '@1001-digital/proxies'

decodeFacets('0x…')                            // parse a facets() return value
computeSelector('transfer(address,uint256)')   // '0xa9059cbb'
canonicalSignature({ type: 'function', name: 'transfer', inputs: [/*…*/] })
```

## API

### `createProxies(config?)`

Creates a proxies client.

**Config options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enrich` | `TargetEnricher` | — | Default per-target enricher. Called with each target address; return `{ abi? }` or `null`. Errors are swallowed per-target. |
| `fetch` | `typeof fetch` | `globalThis.fetch` | Custom fetch function. |

**Returns** a `ProxiesClient` with:

- **`detect(rpc, address)`** — `Promise<RawProxy | null>`. On-chain probe only.
- **`fetch(rpc, address, options?)`** — `Promise<Proxy | null>`. Detect, enrich, and compose.
  - `options.enrich` — per-call enricher (overrides config-level)
  - `options.enrich = false` — skip enrichment for this call

### Detection

- **`detectProxy(rpc, address, fetchFn)`** — tries all patterns in priority order (`diamond → 1967 → 1967-beacon → 1822 → 1167 → safe → 897`), returns the first match.
- **`detectDiamond`** — ERC-165 probe, then `facets()` fallback.
- **`detectEip1967`** — reads impl slot `0x3608…3bc3`; optionally admin slot.
- **`detectEip1967Beacon`** — reads beacon slot `0xa3f0…750d`, then `implementation()` on the beacon.
- **`detectEip1822`** — reads PROXIABLE slot `0xc5f1…f8e2`.
- **`detectEip1167`** — `eth_getCode`, matches minimal proxy bytecode (`363d3d…bf3`).
- **`detectGnosisSafe`** — reads storage slot 0.
- **`detectEip897`** — calls `implementation()` as a last resort.

Each detector returns `null` if the pattern doesn't match; otherwise a `RawProxy`.

### Composition

- **`enrichTargets(targets, enricher | null)`** — applies the enricher to each target; ABIs are filtered to live selectors for diamonds, passed through for plain proxies.
- **`buildCompositeAbi(abis)`** — pure; dedupes functions/events/errors across ABIs (first-wins).

### Utilities

- **`decodeFacets(hex)`** — pure; decodes `(address, bytes4[])[]` loupe return.
- **`computeSelector(signature)`** — pure; keccak256-based 4-byte selector.
- **`canonicalSignature(abiEntry)`** — pure; normalizes tuples/arrays into a signature string.
- **`filterAbiBySelectors(abi, selectors)`** — pure; keeps non-functions, filters functions by selector.
- **`ethCall`**, **`ethGetStorageAt`**, **`ethGetCode`** — minimal JSON-RPC helpers.

### Constants

```ts
SUPPORTS_INTERFACE_SELECTOR      // '0x01ffc9a7'
DIAMOND_LOUPE_INTERFACE_ID       // '0x48e2b093'
FACETS_SELECTOR                  // '0x7a0ed627'
IMPLEMENTATION_SELECTOR          // '0x5c60da1b'
EIP1967_IMPL_SLOT
EIP1967_BEACON_SLOT
EIP1967_ADMIN_SLOT
EIP1822_PROXIABLE_SLOT
EIP1167_BYTECODE_PREFIX
EIP1167_BYTECODE_SUFFIX
ZERO_ADDRESS
```

### Errors

- **`ProxiesError`** — base class.
- **`ProxiesDecodeError`** — malformed `facets()` return.
- **`ProxiesFetchError`** — JSON-RPC transport error.

The client's `detect` and `fetch` methods swallow RPC-layer errors and return
`null`; only `decodeFacets` (called directly) can throw `ProxiesDecodeError`
on malformed input.

## Shapes

### `ProxyPattern`

```ts
type ProxyPattern =
  | 'eip-2535-diamond'
  | 'eip-1967'
  | 'eip-1967-beacon'
  | 'eip-1822'
  | 'eip-1167'
  | 'gnosis-safe'
  | 'eip-897'
```

### `ResolvedTarget`

```ts
{
  address: string
  // undefined = all selectors route here (plain proxy)
  // defined = diamond facet selector scope
  selectors?: string[]
}
```

### `RawProxy`

```ts
{
  pattern: ProxyPattern
  targets: ResolvedTarget[]   // 1 entry except for diamonds
  beacon?: string             // only for eip-1967-beacon
  admin?: string              // only for eip-1967 when admin slot is set
}
```

### `EnrichedTarget`

```ts
{
  address: string
  selectors?: string[]
  abi?: unknown[]
}
```

### `Proxy`

```ts
{
  pattern: ProxyPattern
  targets: EnrichedTarget[]
  beacon?: string
  admin?: string
  compositeAbi?: unknown[]   // deduped by selector
}
```

### `TargetEnrichment`

```ts
{ abi?: unknown[] }
```

### `TargetEnricher`

```ts
type TargetEnricher = (address: string) => Promise<TargetEnrichment | null>
```

## Design notes

- **Narrow scope** — detects patterns and composes ABIs; no opinion on documentation formats or richer per-target metadata.
- **Dependency-injected enrichment** — the factory wires I/O when you ask; the primitives work offline.
- **First-wins ABI dedup** — pass the most authoritative ABI first (e.g. main contract → impl, or main diamond → facets).
- **Single-hop resolution** — if a resolved implementation is itself a proxy, `detectProxy` does not recurse. Beacon stays supported as a defined two-step pattern.
- **Minimal runtime deps** — only `@noble/hashes` for keccak256.

## License

MIT
