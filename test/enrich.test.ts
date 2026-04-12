import { describe, it, expect, vi } from 'vitest'
import { enrichFacets } from '../src'
import type { FacetEnrichment, RawFacet } from '../src'

const rawFacets: RawFacet[] = [
  { facetAddress: '0x' + 'aa'.repeat(20), functionSelectors: ['0xa9059cbb'] },   // transfer
  { facetAddress: '0x' + 'bb'.repeat(20), functionSelectors: ['0x18160ddd'] },   // totalSupply
]

describe('enrichFacets', () => {
  it('returns address-only FacetInfo when enricher is null', async () => {
    const facets = await enrichFacets(rawFacets, null)
    expect(facets).toHaveLength(2)
    expect(facets[0]).toEqual({
      address: '0x' + 'aa'.repeat(20),
      selectors: ['0xa9059cbb'],
    })
    expect(facets[0].abi).toBeUndefined()
  })

  it('populates ABI filtered to the facet selectors', async () => {
    const enrich = vi.fn(async (addr: string): Promise<FacetEnrichment | null> => {
      if (addr === '0x' + 'aa'.repeat(20)) {
        return {
          abi: [
            { type: 'function', name: 'transfer', inputs: [{ type: 'address' }, { type: 'uint256' }] },
            // Filtered out — not in the facet's selector list
            { type: 'function', name: 'approve', inputs: [{ type: 'address' }, { type: 'uint256' }] },
          ],
        }
      }
      return null
    })

    const facets = await enrichFacets(rawFacets, enrich)
    expect(enrich).toHaveBeenCalledTimes(2)
    expect(facets[0].abi).toHaveLength(1)
    expect((facets[0].abi as any)[0].name).toBe('transfer')
    expect(facets[1].abi).toBeUndefined()
  })

  it('swallows per-facet enricher errors', async () => {
    const enrich = vi.fn(async () => { throw new Error('network boom') })
    const facets = await enrichFacets(rawFacets, enrich)
    expect(facets).toHaveLength(2)
    expect(facets[0].abi).toBeUndefined()
    expect(facets[1].abi).toBeUndefined()
  })

  it('preserves facet order', async () => {
    const enrich = vi.fn(async () => ({ abi: [{ type: 'fallback' }] }))
    const facets = await enrichFacets(rawFacets, enrich)
    expect(facets[0].address).toBe('0x' + 'aa'.repeat(20))
    expect(facets[1].address).toBe('0x' + 'bb'.repeat(20))
  })

  it('returns empty list for an empty input', async () => {
    expect(await enrichFacets([], null)).toEqual([])
  })
})
