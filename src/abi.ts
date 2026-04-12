import { canonicalSignature, computeSelector } from './selector'
import type { AbiFunctionLike } from './types'

/**
 * Keep all non-function ABI entries; keep function entries whose computed
 * selector is in the provided selector set. Verified facet contracts may
 * declare extra functions not actually mounted on the diamond — this trims them.
 */
export function filterAbiBySelectors(abi: unknown[], selectors: string[]): unknown[] {
  const set = new Set(selectors.map(s => s.toLowerCase()))

  return abi.filter(item => {
    if (!isAbiFunction(item)) return true
    try {
      const sel = computeSelector(canonicalSignature(item)).toLowerCase()
      return set.has(sel)
    } catch {
      return false
    }
  })
}

/**
 * Combine multiple ABIs into a single composite. First-occurrence wins:
 *   - functions deduped by selector
 *   - events and errors deduped by `type:name(canonicalInputs)`
 *   - other entries (constructor, fallback, receive) kept as-is
 */
export function buildCompositeAbi(abis: unknown[][]): unknown[] {
  const seenSelectors = new Set<string>()
  const seenEventErrors = new Set<string>()
  const composite: unknown[] = []

  for (const abi of abis) {
    for (const item of abi) {
      if (isAbiFunction(item)) {
        try {
          const sel = computeSelector(canonicalSignature(item)).toLowerCase()
          if (seenSelectors.has(sel)) continue
          seenSelectors.add(sel)
        } catch {
          // Include items we can't key
        }
      } else if (isEventOrError(item)) {
        try {
          const key = `${item.type}:${canonicalSignature(item)}`
          if (seenEventErrors.has(key)) continue
          seenEventErrors.add(key)
        } catch {
          // Include items we can't key
        }
      }
      composite.push(item)
    }
  }

  return composite
}

function isAbiFunction(item: unknown): item is AbiFunctionLike {
  return typeof item === 'object'
    && item !== null
    && (item as { type?: unknown }).type === 'function'
    && typeof (item as { name?: unknown }).name === 'string'
}

function isEventOrError(item: unknown): item is AbiFunctionLike {
  if (typeof item !== 'object' || item === null) return false
  const t = (item as { type?: unknown }).type
  return (t === 'event' || t === 'error')
    && typeof (item as { name?: unknown }).name === 'string'
}
