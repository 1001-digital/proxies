import { vi } from 'vitest'

export interface MockRoute {
  match: (url: string, body: string) => boolean
  response: { status: number; body: unknown }
}

/**
 * Route-based fetch mock. Routes are matched in order against each request's
 * URL + body. Unmatched requests return 404.
 */
export function createMockFetch(routes: MockRoute[]) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString()
    const body = typeof init?.body === 'string' ? init.body : ''

    for (const route of routes) {
      if (route.match(url, body)) {
        return {
          ok: route.response.status >= 200 && route.response.status < 300,
          status: route.response.status,
          json: () => Promise.resolve(route.response.body),
          text: () => Promise.resolve(JSON.stringify(route.response.body)),
        }
      }
    }

    return { ok: false, status: 404, json: () => Promise.resolve(null) }
  }) as unknown as typeof fetch
}
