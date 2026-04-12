import { ProxiesDecodeError } from './errors'

// Sanity limits to reject malformed data that accidentally decodes.
// Real diamonds have <100 facets and <200 selectors/facet; bound malformed-input cost.
const MAX_FACETS = 200
const MAX_SELECTORS_PER_FACET = 1000

/**
 * Literal on-chain facet tuple (`(address, bytes4[])`) — the shape returned by
 * the ERC-2535 loupe `facets()` call. Use {@link decodeFacets} to parse it.
 */
export interface DecodedFacet {
  facetAddress: string
  functionSelectors: string[]
}

/**
 * Decode the return value of `facets()` — type `(address, bytes4[])[]`.
 * Throws {@link ProxiesDecodeError} on malformed input.
 */
export function decodeFacets(hex: string): DecodedFacet[] {
  const h = hex.startsWith('0x') ? hex.slice(2) : hex
  const W = 64 // one 32-byte word in hex chars

  const readWord = (pos: number): string => {
    if (pos < 0 || pos + W > h.length) {
      throw new ProxiesDecodeError('malformed facets() return: out of bounds')
    }
    return h.slice(pos, pos + W)
  }

  const readUint = (pos: number): number => {
    const word = readWord(pos)
    // Upper 24 bytes must be zero for the value to fit safely in a JS number
    if (!/^0{48}/.test(word)) {
      throw new ProxiesDecodeError('malformed facets() return: value too large')
    }
    return parseInt(word, 16)
  }

  const outerOff = readUint(0) * 2
  const n = readUint(outerOff)
  if (n > MAX_FACETS) {
    throw new ProxiesDecodeError(`malformed facets() return: ${n} facets exceeds limit`)
  }

  const head = outerOff + W
  const facets: DecodedFacet[] = []

  for (let i = 0; i < n; i++) {
    const tupleOff = readUint(head + i * W) * 2
    const tx = head + tupleOff

    const addrWord = readWord(tx)
    if (!/^0{24}/.test(addrWord)) {
      throw new ProxiesDecodeError('malformed facets() return: invalid address')
    }
    const facetAddress = '0x' + addrWord.slice(24).toLowerCase()

    const selOff = readUint(tx + W) * 2
    const selStart = tx + selOff

    const m = readUint(selStart)
    if (m > MAX_SELECTORS_PER_FACET) {
      throw new ProxiesDecodeError(
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

/**
 * Parse a 32-byte ABI-encoded address (right-padded). Returns the lowercase
 * `0x` address, or `null` if the payload is not a well-formed address (wrong
 * length, or non-zero high bytes).
 */
export function parseAddress(hex: string): string | null {
  if (hex.length !== 66) return null
  const body = hex.slice(2).toLowerCase()
  if (!/^0{24}[0-9a-f]{40}$/.test(body)) return null
  return '0x' + body.slice(24)
}
