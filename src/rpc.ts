import { ProxiesFetchError, errorMessage } from './errors'

interface JsonRpcResponse {
  result?: string
  error?: { message: string }
}

async function jsonRpcCall(
  rpc: string,
  method: string,
  params: unknown[],
  fetchFn: typeof globalThis.fetch,
): Promise<string> {
  let res: Response
  try {
    res = await fetchFn(rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    })
  } catch (error) {
    throw new ProxiesFetchError(
      `RPC request failed: ${errorMessage(error)}`,
      { status: 0 },
      { cause: error },
    )
  }

  if (!res.ok) {
    throw new ProxiesFetchError(
      `RPC request failed: ${res.status}`,
      { status: res.status },
    )
  }

  let json: JsonRpcResponse
  try {
    json = await res.json() as JsonRpcResponse
  } catch (error) {
    throw new ProxiesFetchError(
      `Invalid JSON from RPC: ${errorMessage(error)}`,
      { status: res.status },
      { cause: error },
    )
  }

  if (json.error) {
    throw new ProxiesFetchError(
      `RPC error: ${json.error.message}`,
      { status: 0 },
    )
  }

  return json.result ?? '0x'
}

/**
 * Minimal JSON-RPC `eth_call` client. Invokes a view call on the given address
 * at the latest block and returns the raw hex result.
 */
export function ethCall(
  rpc: string,
  to: string,
  data: string,
  fetchFn: typeof globalThis.fetch,
): Promise<string> {
  return jsonRpcCall(rpc, 'eth_call', [{ to, data }, 'latest'], fetchFn)
}

/**
 * Minimal JSON-RPC `eth_getStorageAt` client. Reads a single 32-byte storage
 * slot at the latest block.
 */
export function ethGetStorageAt(
  rpc: string,
  address: string,
  slot: string,
  fetchFn: typeof globalThis.fetch,
): Promise<string> {
  return jsonRpcCall(rpc, 'eth_getStorageAt', [address, slot, 'latest'], fetchFn)
}

/**
 * Minimal JSON-RPC `eth_getCode` client. Returns the deployed runtime bytecode
 * at the latest block.
 */
export function ethGetCode(
  rpc: string,
  address: string,
  fetchFn: typeof globalThis.fetch,
): Promise<string> {
  return jsonRpcCall(rpc, 'eth_getCode', [address, 'latest'], fetchFn)
}
