import { describe, it, expect } from 'vitest'
import { computeSelector, canonicalSignature } from '../src'

describe('computeSelector', () => {
  it('matches the known ERC-20 transfer selector', () => {
    expect(computeSelector('transfer(address,uint256)')).toBe('0xa9059cbb')
  })

  it('matches the known ERC-2535 facets() selector', () => {
    expect(computeSelector('facets()')).toBe('0x7a0ed627')
  })

  it('matches the known ERC-165 supportsInterface selector', () => {
    expect(computeSelector('supportsInterface(bytes4)')).toBe('0x01ffc9a7')
  })

  it('is deterministic across calls', () => {
    expect(computeSelector('balanceOf(address)')).toBe(computeSelector('balanceOf(address)'))
  })
})

describe('canonicalSignature', () => {
  it('handles simple functions', () => {
    const sig = canonicalSignature({
      type: 'function',
      name: 'transfer',
      inputs: [{ type: 'address' }, { type: 'uint256' }],
    })
    expect(sig).toBe('transfer(address,uint256)')
  })

  it('handles no-arg functions', () => {
    expect(canonicalSignature({ type: 'function', name: 'facets' })).toBe('facets()')
  })

  it('expands tuples with nested tuples and array suffixes', () => {
    const sig = canonicalSignature({
      type: 'function',
      name: 'submit',
      inputs: [
        {
          type: 'tuple[]',
          components: [
            { type: 'address' },
            {
              type: 'tuple',
              components: [{ type: 'uint256' }, { type: 'bytes32' }],
            },
          ],
        },
        { type: 'uint256' },
      ],
    })
    expect(sig).toBe('submit((address,(uint256,bytes32))[],uint256)')
  })

  it('preserves fixed-size array suffix on tuples', () => {
    const sig = canonicalSignature({
      type: 'function',
      name: 'batch',
      inputs: [{ type: 'tuple[3]', components: [{ type: 'uint256' }] }],
    })
    expect(sig).toBe('batch((uint256)[3])')
  })

  it('throws when entry has no name', () => {
    expect(() => canonicalSignature({ type: 'function' })).toThrow(/no name/)
  })
})
