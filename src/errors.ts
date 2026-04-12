export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export class DiamondsError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'DiamondsError'
  }
}

/** Raised when the on-chain `facets()` return value cannot be decoded. */
export class DiamondsDecodeError extends DiamondsError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'DiamondsDecodeError'
  }
}

/** Raised when a JSON-RPC request fails at the transport level. */
export class DiamondsFetchError extends DiamondsError {
  public readonly status: number

  constructor(
    message: string,
    details: { status: number },
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'DiamondsFetchError'
    this.status = details.status
  }
}
