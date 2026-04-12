import { describe, it, expect } from 'vitest'
import { filterAbiBySelectors, buildCompositeAbi } from '../src'

describe('filterAbiBySelectors', () => {
  it('keeps events, errors, constructors, fallbacks, receives as-is', () => {
    const abi = [
      { type: 'event', name: 'Transfer', inputs: [] },
      { type: 'error', name: 'Unauthorized', inputs: [] },
      { type: 'constructor', inputs: [] },
      { type: 'fallback' },
      { type: 'receive' },
    ]
    expect(filterAbiBySelectors(abi, [])).toEqual(abi)
  })

  it('keeps only functions whose selector matches', () => {
    const abi = [
      { type: 'function', name: 'transfer', inputs: [{ type: 'address' }, { type: 'uint256' }] }, // 0xa9059cbb
      { type: 'function', name: 'balanceOf', inputs: [{ type: 'address' }] },                     // 0x70a08231
      { type: 'function', name: 'totalSupply', inputs: [] },                                      // 0x18160ddd
    ]
    const filtered = filterAbiBySelectors(abi, ['0xa9059cbb', '0x18160ddd'])
    expect(filtered).toHaveLength(2)
    expect(filtered.map((f: any) => f.name).sort()).toEqual(['totalSupply', 'transfer'])
  })

  it('is case-insensitive on selectors', () => {
    const abi = [
      { type: 'function', name: 'transfer', inputs: [{ type: 'address' }, { type: 'uint256' }] },
    ]
    expect(filterAbiBySelectors(abi, ['0xA9059CBB'])).toHaveLength(1)
  })

  it('treats missing inputs as ()', () => {
    const abi = [{ type: 'function', name: 'facets' }] // 0x7a0ed627
    expect(filterAbiBySelectors(abi, ['0x7a0ed627'])).toHaveLength(1)
  })
})

describe('buildCompositeAbi', () => {
  it('dedups functions across facets by selector (first wins)', () => {
    const facetA = [
      { type: 'function', name: 'transfer', inputs: [{ type: 'address' }, { type: 'uint256' }] },
      { type: 'function', name: 'balanceOf', inputs: [{ type: 'address' }] },
    ]
    const facetB = [
      // Same selector as facetA's transfer — should be dropped
      { type: 'function', name: 'transfer', inputs: [{ type: 'address' }, { type: 'uint256' }] },
      { type: 'function', name: 'totalSupply', inputs: [] },
    ]
    const composite = buildCompositeAbi([facetA, facetB])
    expect(composite).toHaveLength(3)
    expect(composite.map((f: any) => f.name)).toEqual(['transfer', 'balanceOf', 'totalSupply'])
  })

  it('dedups events by type:canonicalSignature', () => {
    const facetA = [
      { type: 'event', name: 'Transfer', inputs: [{ type: 'address' }, { type: 'address' }, { type: 'uint256' }] },
    ]
    const facetB = [
      { type: 'event', name: 'Transfer', inputs: [{ type: 'address' }, { type: 'address' }, { type: 'uint256' }] },
      // Same name, different signature — should still be included
      { type: 'event', name: 'Transfer', inputs: [{ type: 'address' }, { type: 'uint256' }] },
    ]
    const composite = buildCompositeAbi([facetA, facetB])
    expect(composite).toHaveLength(2)
  })

  it('keeps constructors, fallbacks, and receives as-is (no dedup)', () => {
    const facetA = [{ type: 'constructor', inputs: [] }, { type: 'fallback' }]
    const facetB = [{ type: 'constructor', inputs: [] }, { type: 'receive' }]
    const composite = buildCompositeAbi([facetA, facetB])
    expect(composite).toHaveLength(4)
  })

  it('returns [] for an empty input', () => {
    expect(buildCompositeAbi([])).toEqual([])
  })
})
