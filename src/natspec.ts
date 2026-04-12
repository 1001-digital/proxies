type NatSpecDoc = Record<string, unknown>

const RECORD_KEYS = new Set(['methods', 'events', 'errors', 'stateVariables'])

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/**
 * Shallow-merge NatSpec `userdoc` / `devdoc` objects across multiple targets.
 *
 * - Record sections (`methods`, `events`, `errors`, `stateVariables`) merge
 *   per key — first non-overwritten entry wins.
 * - Scalar fields (`title`, `author`, `notice`, `details`, …) take the first
 *   non-undefined value.
 *
 * First-wins priority means callers should pass the most authoritative doc
 * first (e.g. the main contract's docs, then each implementation or facet).
 *
 * Returns `undefined` when every input doc is `null` / `undefined`.
 */
export function mergeNatspecDocs(
  ...docs: (NatSpecDoc | undefined | null)[]
): NatSpecDoc | undefined {
  const present = docs.filter(
    (d): d is NatSpecDoc => d !== undefined && d !== null,
  )
  if (present.length === 0) return undefined

  const merged: Record<string, unknown> = {}

  for (const doc of present) {
    for (const [key, value] of Object.entries(doc)) {
      if (value === undefined) continue
      if (RECORD_KEYS.has(key) && isRecord(value)) {
        const existing = isRecord(merged[key]) ? (merged[key] as Record<string, unknown>) : {}
        merged[key] = { ...value, ...existing }
      } else if (merged[key] === undefined) {
        merged[key] = value
      }
    }
  }

  return Object.keys(merged).length > 0 ? merged : undefined
}
