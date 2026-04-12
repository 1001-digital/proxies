import { describe, it, expect } from 'vitest'
import { mergeNatspecDocs } from '../src'

describe('mergeNatspecDocs', () => {
  it('returns undefined when every input is nullish', () => {
    expect(mergeNatspecDocs()).toBeUndefined()
    expect(mergeNatspecDocs(undefined, null)).toBeUndefined()
  })

  it('first-wins for scalar fields', () => {
    const merged = mergeNatspecDocs(
      { notice: 'primary' },
      { notice: 'secondary' },
    )
    expect(merged).toEqual({ notice: 'primary' })
  })

  it('shallow-merges record sections per key (first-wins per method)', () => {
    const merged = mergeNatspecDocs(
      {
        methods: {
          'foo()': { notice: 'from first' },
        },
      },
      {
        methods: {
          'foo()': { notice: 'from second — should lose' },
          'bar()': { notice: 'from second — should win' },
        },
      },
    )
    expect(merged).toEqual({
      methods: {
        'foo()': { notice: 'from first' },
        'bar()': { notice: 'from second — should win' },
      },
    })
  })

  it('merges all four record sections independently', () => {
    const merged = mergeNatspecDocs(
      { events: { 'Transfer': { notice: 'evt' } } },
      { errors: { 'Unauthorized': { notice: 'err' } } },
      { stateVariables: { 'owner': { notice: 'sv' } } },
    )
    expect(merged).toEqual({
      events: { 'Transfer': { notice: 'evt' } },
      errors: { 'Unauthorized': { notice: 'err' } },
      stateVariables: { 'owner': { notice: 'sv' } },
    })
  })

  it('ignores undefined entries in input list', () => {
    const merged = mergeNatspecDocs(
      undefined,
      { notice: 'real' },
      null,
    )
    expect(merged).toEqual({ notice: 'real' })
  })
})
