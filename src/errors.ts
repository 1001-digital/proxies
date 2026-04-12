export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export class ProxiesError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'ProxiesError'
  }
}

/** Raised when the on-chain `facets()` return value cannot be decoded. */
export class ProxiesDecodeError extends ProxiesError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'ProxiesDecodeError'
  }
}

/** Raised when a JSON-RPC request fails at the transport level. */
export class ProxiesFetchError extends ProxiesError {
  public readonly status: number

  constructor(
    message: string,
    details: { status: number },
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'ProxiesFetchError'
    this.status = details.status
  }
}
