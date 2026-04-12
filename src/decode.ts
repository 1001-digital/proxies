import { DiamondsDecodeError } from './errors'
import type { RawFacet } from './types'

// Sanity limits to reject malformed data that accidentally decodes.
// Real diamonds have <100 facets and <200 selectors/facet; bound malformed-input cost.
const MAX_FACETS = 200
const MAX_SELECTORS_PER_FACET = 1000

/**
 * Decode the return value of `facets()` — type `(address, bytes4[])[]`.
 * Throws {@link DiamondsDecodeError} on malformed input.
 */
export function decodeFacets(hex: string): RawFacet[] {
  const h = hex.startsWith('0x') ? hex.slice(2) : hex
  const W = 64 // one 32-byte word in hex chars

  const readWord = (pos: number): string => {
    if (pos < 0 || pos + W > h.length) {
      throw new DiamondsDecodeError('malformed facets() return: out of bounds')
    }
    return h.slice(pos, pos + W)
  }

  const readUint = (pos: number): number => {
    const word = readWord(pos)
    // Upper 24 bytes must be zero for the value to fit safely in a JS number
    if (!/^0{48}/.test(word)) {
      throw new DiamondsDecodeError('malformed facets() return: value too large')
    }
    return parseInt(word, 16)
  }

  const outerOff = readUint(0) * 2
  const n = readUint(outerOff)
  if (n > MAX_FACETS) {
    throw new DiamondsDecodeError(`malformed facets() return: ${n} facets exceeds limit`)
  }

  const head = outerOff + W
  const facets: RawFacet[] = []

  for (let i = 0; i < n; i++) {
    const tupleOff = readUint(head + i * W) * 2
    const tx = head + tupleOff

    const addrWord = readWord(tx)
    if (!/^0{24}/.test(addrWord)) {
      throw new DiamondsDecodeError('malformed facets() return: invalid address')
    }
    const facetAddress = '0x' + addrWord.slice(24).toLowerCase()

    const selOff = readUint(tx + W) * 2
    const selStart = tx + selOff

    const m = readUint(selStart)
    if (m > MAX_SELECTORS_PER_FACET) {
      throw new DiamondsDecodeError(
        `malformed facets() return: ${m} selectors exceeds limit`,
      )
    }

    const selectors: string[] = []
    for (let j = 0; j < m; j++) {
      const slot = readWord(selStart + W + j * W)
      selectors.push('0x' + slot.slice(0, 8).toLowerCase())
    }

    facets.push({ facetAddress, functionSelectors: selectors })
  }

  return facets
}

/**
 * Parse a 32-byte ABI-encoded bool. Returns `null` if the response is not a
 * well-formed bool (wrong length, or non-zero high bits).
 */
export function parseBool(hex: string): boolean | null {
  if (hex.length !== 66) return null
  const body = hex.slice(2).toLowerCase()
  if (!/^0{63}[01]$/.test(body)) return null
  return body.slice(-1) === '1'
}
