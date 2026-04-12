# @1001-digital/diamonds

ERC-2535 Diamond inspection primitives for TypeScript — detect facets, decode the loupe, build composite ABIs.

Narrow on purpose: this package knows ERC-2535, selectors, and ABIs.
Anything richer — documentation, verification sources, per-facet metadata —
is the consumer's concern. Bring your own enricher.

## Install

```bash
pnpm add @1001-digital/diamonds
```

## Usage

### Fetch a diamond

```ts
import { createDiamonds } from '@1001-digital/diamonds'

const diamonds = createDiamonds()

const result = await diamonds.fetch(
  'https://eth.llamarpc.com',
  '0xDiamondAddress…',
)

if (result) {
  console.log(result.facets)         // [{ address, selectors }, …]
  console.log(result.compositeAbi)   // undefined — no enricher configured
}
```

### Enrich with Sourcify (or anything else)

The enricher returns each facet's ABI. Anything richer (sources, bytecode,
documentation, …) is the consumer's concern — see *Detect and do your own
enrichment* below.

```ts
import { createDiamonds } from '@1001-digital/diamonds'

async function sourcifyAbi(address: string) {
  const res = await fetch(
    `https://sourcify.dev/server/v2/contract/1/${address}?fields=abi`,
  )
  if (!res.ok) return null
  const { abi } = await res.json()
  return { abi }
}

const diamonds = createDiamonds({ enrich: sourcifyAbi })

const result = await diamonds.fetch(
  'https://eth.llamarpc.com',
  '0xDiamondAddress…',
)

if (result) {
  console.log(result.facets[0].abi)  // ABI filtered to the facet's selectors
  console.log(result.compositeAbi)   // all facet ABIs deduped by selector
}
```

### Detect and do your own enrichment

For richer per-facet metadata, use `detect` and own the enrichment step
end-to-end. `filterAbiBySelectors` and `buildCompositeAbi` remain useful
primitives.

```ts
import {
  createDiamonds,
  filterAbiBySelectors,
  buildCompositeAbi,
} from '@1001-digital/diamonds'

const diamonds = createDiamonds()
const raw = await diamonds.detect(rpc, address)

if (raw) {
  const enriched = await Promise.all(raw.map(async rf => {
    const src = await mySource(rf.facetAddress)
    return {
      address: rf.facetAddress,
      selectors: rf.functionSelectors,
      abi: src?.abi ? filterAbiBySelectors(src.abi, rf.functionSelectors) : undefined,
      // …plus whatever else your source provides
      metadata: src?.metadata,
    }
  }))

  const compositeAbi = buildCompositeAbi(
    enriched.map(f => f.abi).filter((a): a is unknown[] => !!a),
  )
}
```

### Standalone primitives

All low-level utilities are exported directly — use them without the factory:

```ts
import {
  decodeFacets,
  computeSelector,
  canonicalSignature,
  filterAbiBySelectors,
  buildCompositeAbi,
  detectAndFetchFacets,
  enrichFacets,
} from '@1001-digital/diamonds'

decodeFacets('0x…')                            // parse a facets() return value
computeSelector('transfer(address,uint256)')   // '0xa9059cbb'
canonicalSignature({ type: 'function', name: 'transfer', inputs: [/*…*/] })
```

## API

### `createDiamonds(config?)`

Creates a diamonds client.

**Config options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enrich` | `FacetEnricher` | — | Default per-facet enricher. Called with each facet address; return `{ abi? }` or `null`. Errors are swallowed per-facet. |
| `fetch` | `typeof fetch` | `globalThis.fetch` | Custom fetch function. |

**Returns** a `DiamondsClient` with:

- **`detect(rpc, address)`** — `Promise<RawFacet[] | null>`. On-chain probe only.
- **`fetch(rpc, address, options?)`** — `Promise<Diamond | null>`. Detect, enrich, and compose.
  - `options.enrich` — per-call enricher (overrides config-level)
  - `options.enrich = false` — skip enrichment for this call

### Standalone functions

- **`detectAndFetchFacets(rpc, address, fetchFn)`** — `null | RawFacet[]`. Uses ERC-165 first, then falls back to a direct `facets()` probe.
- **`enrichFacets(rawFacets, enricher | null)`** — applies the enricher to each facet; ABIs are filtered to live selectors.
- **`decodeFacets(hex)`** — pure; decodes the ABI-encoded `(address, bytes4[])[]` return value.
- **`computeSelector(signature)`** — pure; keccak256-based 4-byte selector.
- **`canonicalSignature(abiEntry)`** — pure; normalizes tuples/arrays into a signature string.
- **`filterAbiBySelectors(abi, selectors)`** — pure; keeps non-functions, filters functions by selector.
- **`buildCompositeAbi(abis)`** — pure; dedupes functions/events/errors across ABIs (first-wins).

### Constants

```ts
SUPPORTS_INTERFACE_SELECTOR  // '0x01ffc9a7'
DIAMOND_LOUPE_INTERFACE_ID   // '0x48e2b093'
FACETS_SELECTOR              // '0x7a0ed627'
ZERO_ADDRESS                 // '0x00…00'
```

### Errors

- **`DiamondsError`** — base class.
- **`DiamondsDecodeError`** — malformed `facets()` return value.

The client's `detect` and `fetch` methods swallow RPC-layer errors and return
`null`; only `decodeFacets` (called directly) can throw `DiamondsDecodeError`
on malformed input.

## Shapes

### `RawFacet`

```ts
{ facetAddress: string; functionSelectors: string[] }
```

### `FacetInfo`

```ts
{
  address: string
  selectors: string[]
  abi?: unknown[]   // filtered to live selectors
}
```

### `Diamond`

```ts
{
  facets: FacetInfo[]
  compositeAbi?: unknown[]   // deduped by selector
}
```

### `FacetEnrichment`

```ts
{ abi?: unknown[] }
```

### `FacetEnricher`

```ts
type FacetEnricher = (address: string) => Promise<FacetEnrichment | null>
```

## Design notes

- **Narrow scope** — the package composes ABIs; it takes no opinion on documentation formats or metadata shapes.
- **Dependency-injected enrichment** — the factory wires I/O when you ask; the primitives work offline.
- **First-wins ABI dedup** — pass the most authoritative ABI first (e.g. main diamond → facets).
- **Minimal runtime deps** — only `@noble/hashes` for keccak256.

## License

MIT
