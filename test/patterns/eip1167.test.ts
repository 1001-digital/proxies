import { describe, it, expect } from 'vitest'
import { detectEip1167 } from '../../src'
import { encodeEip1167Bytecode, getMethod, rpcEnvelope } from '../helpers/abi'
import { createMockFetch } from '../helpers/mock-fetch'

const RPC = 'https://rpc.test'
const PROXY = '0x1111111111111111111111111111111111111111'
const IMPL = '0x' + 'ab'.repeat(20)

describe('detectEip1167', () => {
  it('returns impl target when runtime bytecode matches the EIP-1167 shape', async () => {
    const fetchFn = createMockFetch([
      {
        match: (_, body) => getMethod(body) === 'eth_getCode',
        response: { status: 200, body: rpcEnvelope(encodeEip1167Bytecode(IMPL)) },
      },
    ])
    const result = await detectEip1167(RPC, PROXY, fetchFn)
    expect(result).toEqual({
      pattern: 'eip-1167',
      targets: [{ address: IMPL }],
    })
  })

  it('returns null when the bytecode length is wrong', async () => {
    const fetchFn = createMockFetch([
      {
        match: (_, body) => getMethod(body) === 'eth_getCode',
        // Arbitrary non-1167 contract bytecode
        response: { status: 200, body: rpcEnvelope('0x6080604052' + '00'.repeat(100)) },
      },
    ])
    expect(await detectEip1167(RPC, PROXY, fetchFn)).toBeNull()
  })

  it('returns null when the prefix does not match', async () => {
    // Correct length (90 chars) but wrong prefix
    const fake = '0x' + 'ff'.repeat(10) + 'ab'.repeat(20) + '5af43d82803e903d91602b57fd5bf3'
    const fetchFn = createMockFetch([
      {
        match: (_, body) => getMethod(body) === 'eth_getCode',
        response: { status: 200, body: rpcEnvelope(fake) },
      },
    ])
    expect(await detectEip1167(RPC, PROXY, fetchFn)).toBeNull()
  })

  it('returns null for an EOA (empty bytecode)', async () => {
    const fetchFn = createMockFetch([
      {
        match: (_, body) => getMethod(body) === 'eth_getCode',
        response: { status: 200, body: rpcEnvelope('0x') },
      },
    ])
    expect(await detectEip1167(RPC, PROXY, fetchFn)).toBeNull()
  })
})
