import { describe, it, expect } from 'vitest'
import { decodeFacets, DiamondsDecodeError } from '../src'
import { word as w, selSlot as selWord, blob } from './helpers/abi'

describe('decodeFacets', () => {
  it('decodes a single-facet payload', () => {
    const payload = blob(
      w(0x20),                                                          // outer offset
      w(1),                                                             // N = 1
      w(0x20),                                                          // tuple0 offset (relative to after N)
      w('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'),                    // address
      w(0x40),                                                          // bytes4[] offset (relative to tuple)
      w(2),                                                             // 2 selectors
      selWord('0xa9059cbb'),                                            // transfer
      selWord('0x70a08231'),                                            // balanceOf
    )

    const facets = decodeFacets(payload)
    expect(facets).toHaveLength(1)
    expect(facets[0].facetAddress).toBe('0x' + 'aa'.repeat(20))
    expect(facets[0].functionSelectors).toEqual(['0xa9059cbb', '0x70a08231'])
  })

  it('decodes a two-facet payload with different selector counts', () => {
    const payload = blob(
      w(0x20),                                                          // outer offset
      w(2),                                                             // N = 2
      w(0x40),                                                          // tuple0 offset
      w(0xe0),                                                          // tuple1 offset
      // tuple0
      w('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'),
      w(0x40),                                                          // selOff (relative to tuple)
      w(2),
      selWord('0x11223344'),
      selWord('0x55667788'),
      // tuple1
      w('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'),
      w(0x40),
      w(1),
      selWord('0xdeadbeef'),
    )

    const facets = decodeFacets(payload)
    expect(facets).toHaveLength(2)
    expect(facets[0]).toEqual({
      facetAddress: '0x' + 'aa'.repeat(20),
      functionSelectors: ['0x11223344', '0x55667788'],
    })
    expect(facets[1]).toEqual({
      facetAddress: '0x' + 'bb'.repeat(20),
      functionSelectors: ['0xdeadbeef'],
    })
  })

  it('decodes an empty facet list', () => {
    const payload = blob(w(0x20), w(0))
    expect(decodeFacets(payload)).toEqual([])
  })

  it('throws DiamondsDecodeError on out-of-bounds access', () => {
    const payload = blob(w(0x20), w(5)) // claims 5 facets but gives nothing
    expect(() => decodeFacets(payload)).toThrow(DiamondsDecodeError)
    expect(() => decodeFacets(payload)).toThrow(/malformed/)
  })

  it('throws on value too large to fit in a safe integer', () => {
    const payload = blob(
      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
      w(1),
    )
    expect(() => decodeFacets(payload)).toThrow(/value too large/)
  })

  it('throws when facet count exceeds the sanity limit', () => {
    const payload = blob(w(0x20), w(100000))
    expect(() => decodeFacets(payload)).toThrow(/exceeds limit/)
  })

  it('throws when address upper bytes are non-zero', () => {
    const payload = blob(
      w(0x20),
      w(1),
      w(0x20),
      'ff' + '0'.repeat(22) + 'aa'.repeat(20),
      w(0x40),
      w(0),
    )
    expect(() => decodeFacets(payload)).toThrow(/invalid address/)
  })
})
