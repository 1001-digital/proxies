// Shared test helpers for building ABI-encoded hex fixtures and RPC envelopes.

/** Pad a number or hex string to a 32-byte (64 hex char) word. */
export const word = (n: number | string): string => {
  const hex = typeof n === 'number' ? n.toString(16) : n.replace(/^0x/, '')
  return hex.padStart(64, '0')
}

/** Left-align a 4-byte selector into a 32-byte slot. */
export const selSlot = (s: string): string => s.replace(/^0x/, '').padEnd(64, '0')

/** Concatenate 32-byte words into a 0x-prefixed hex blob. */
export const blob = (...words: string[]): string => '0x' + words.join('')

/** Build a valid `facets()` return payload for a list of facets. */
export const encodeFacets = (
  facets: { address: string; selectors: string[] }[],
): string => {
  const n = facets.length
  let out = '0x' + word(0x20) + word(n)

  // Tuple offsets relative to the position after N
  const offsets: number[] = []
  let cursor = n * 32 // past the offsets array
  for (const f of facets) {
    offsets.push(cursor)
    cursor += 96 + f.selectors.length * 32
  }
  for (const off of offsets) out += word(off)

  for (const f of facets) {
    out += word(f.address.replace(/^0x/, ''))
    out += word(0x40) // selOff relative to tuple
    out += word(f.selectors.length)
    for (const s of f.selectors) out += selSlot(s)
  }

  return out
}

/** ABI-encoded bool (32 bytes). */
export const encodeBool = (v: boolean): string => '0x' + word(v ? 1 : 0)

/** Wrap an eth_call result in a JSON-RPC envelope. */
export const rpcEnvelope = (result: string) => ({ jsonrpc: '2.0', id: 1, result })

/** Extract the calldata from an eth_call request body. */
export const getCalldata = (body: string): string => {
  try {
    const parsed = JSON.parse(body)
    const data: string = parsed?.params?.[0]?.data ?? ''
    return data.toLowerCase()
  } catch {
    return ''
  }
}

/** Extract the `to` address from an eth_call request body. */
export const getCallTo = (body: string): string => {
  try {
    const parsed = JSON.parse(body)
    return (parsed?.params?.[0]?.to ?? '').toLowerCase()
  } catch {
    return ''
  }
}
