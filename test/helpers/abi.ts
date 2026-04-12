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

/** ABI-encoded address (right-padded into a 32-byte word). */
export const encodeAddress = (addr: string): string =>
  '0x' + word(addr.replace(/^0x/, ''))

/** EIP-1167 minimal proxy runtime bytecode for a given implementation. */
export const encodeEip1167Bytecode = (impl: string): string =>
  '0x363d3d373d3d3d363d73' + impl.replace(/^0x/, '').toLowerCase() + '5af43d82803e903d91602b57fd5bf3'

/** Wrap an eth_call / eth_getStorageAt / eth_getCode result in a JSON-RPC envelope. */
export const rpcEnvelope = (result: string) => ({ jsonrpc: '2.0', id: 1, result })

/** JSON-RPC error envelope (mimics a revert). */
export const rpcRevert = (message = 'revert') => ({
  jsonrpc: '2.0',
  id: 1,
  error: { message },
})

/** Extract the JSON-RPC method from a request body. */
export const getMethod = (body: string): string => {
  try {
    return JSON.parse(body)?.method ?? ''
  } catch {
    return ''
  }
}

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

/** Extract the slot from an eth_getStorageAt request body. */
export const getStorageSlot = (body: string): string => {
  try {
    const parsed = JSON.parse(body)
    return (parsed?.params?.[1] ?? '').toLowerCase()
  } catch {
    return ''
  }
}

/** Extract the address from an eth_getStorageAt or eth_getCode request body. */
export const getAddressParam = (body: string): string => {
  try {
    const parsed = JSON.parse(body)
    return (parsed?.params?.[0] ?? '').toLowerCase()
  } catch {
    return ''
  }
}
