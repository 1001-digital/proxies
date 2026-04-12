import { describe, it, expect } from 'vitest'
import { detectEip897, IMPLEMENTATION_SELECTOR } from '../../src'
import { encodeAddress, getCalldata, getMethod, rpcEnvelope, rpcRevert } from '../helpers/abi'
import { createMockFetch } from '../helpers/mock-fetch'

const RPC = 'https://rpc.test'
const PROXY = '0x1111111111111111111111111111111111111111'
const IMPL = '0x' + 'ab'.repeat(20)

describe('detectEip897', () => {
  it('returns impl target when implementation() returns a non-zero address', async () => {
    const fetchFn = createMockFetch([
      {
        match: (_, body) =>
          getMethod(body) === 'eth_call'
          && getCalldata(body) === IMPLEMENTATION_SELECTOR,
        response: { status: 200, body: rpcEnvelope(encodeAddress(IMPL)) },
      },
    ])
    const result = await detectEip897(RPC, PROXY, fetchFn)
    expect(result).toEqual({
      pattern: 'eip-897',
      targets: [{ address: IMPL }],
    })
  })

  it('returns null when implementation() returns zero', async () => {
    const fetchFn = createMockFetch([
      {
        match: (_, body) => getMethod(body) === 'eth_call',
        response: { status: 200, body: rpcEnvelope(encodeAddress('0x' + '00'.repeat(20))) },
      },
    ])
    expect(await detectEip897(RPC, PROXY, fetchFn)).toBeNull()
  })

  it('returns null when implementation() reverts', async () => {
    const fetchFn = createMockFetch([
      {
        match: (_, body) => getMethod(body) === 'eth_call',
        response: { status: 200, body: rpcRevert() },
      },
    ])
    expect(await detectEip897(RPC, PROXY, fetchFn)).toBeNull()
  })
})
