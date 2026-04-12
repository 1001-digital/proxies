import { DiamondsFetchError, errorMessage } from './errors'

interface JsonRpcResponse {
  result?: string
  error?: { message: string }
}

/**
 * Minimal JSON-RPC `eth_call` client. Intentionally small: the package only
 * needs to invoke view calls on diamonds; full provider abstractions belong
 * in the consumer.
 */
export async function ethCall(
  rpc: string,
  to: string,
  data: string,
  fetchFn: typeof globalThis.fetch,
): Promise<string> {
  let res: Response
  try {
    res = await fetchFn(rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [{ to, data }, 'latest'],
      }),
    })
  } catch (error) {
    throw new DiamondsFetchError(
      `RPC request failed: ${errorMessage(error)}`,
      { status: 0 },
      { cause: error },
    )
  }

  if (!res.ok) {
    throw new DiamondsFetchError(
      `RPC request failed: ${res.status}`,
      { status: res.status },
    )
  }

  let json: JsonRpcResponse
  try {
    json = await res.json() as JsonRpcResponse
  } catch (error) {
    throw new DiamondsFetchError(
      `Invalid JSON from RPC: ${errorMessage(error)}`,
      { status: res.status },
      { cause: error },
    )
  }

  if (json.error) {
    throw new DiamondsFetchError(
      `RPC error: ${json.error.message}`,
      { status: 0 },
    )
  }

  return json.result ?? '0x'
}
