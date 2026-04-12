import { describe, it, expect, vi } from 'vitest'
import { enrichTargets } from '../src'
import type { ResolvedTarget, TargetEnrichment } from '../src'

const diamondTargets: ResolvedTarget[] = [
  { address: '0x' + 'aa'.repeat(20), selectors: ['0xa9059cbb'] },   // transfer
  { address: '0x' + 'bb'.repeat(20), selectors: ['0x18160ddd'] },   // totalSupply
]

const singleImplTarget: ResolvedTarget = { address: '0x' + 'cc'.repeat(20) }

describe('enrichTargets', () => {
  it('returns address+selectors only when enricher is null', async () => {
    const targets = await enrichTargets(diamondTargets, null)
    expect(targets).toHaveLength(2)
    expect(targets[0]).toEqual({
      address: '0x' + 'aa'.repeat(20),
      selectors: ['0xa9059cbb'],
    })
    expect(targets[0].abi).toBeUndefined()
  })

  it('filters ABI by facet selectors when the target has selectors', async () => {
    const enrich = vi.fn(async (addr: string): Promise<TargetEnrichment | null> => {
      if (addr === '0x' + 'aa'.repeat(20)) {
        return {
          abi: [
            { type: 'function', name: 'transfer', inputs: [{ type: 'address' }, { type: 'uint256' }] },
            // Filtered out — not in the facet's selector list
            { type: 'function', name: 'approve', inputs: [{ type: 'address' }, { type: 'uint256' }] },
          ],
        }
      }
      return null
    })

    const targets = await enrichTargets(diamondTargets, enrich)
    expect(enrich).toHaveBeenCalledTimes(2)
    expect(targets[0].abi).toHaveLength(1)
    expect((targets[0].abi as any)[0].name).toBe('transfer')
    expect(targets[1].abi).toBeUndefined()
  })

  it('passes the full ABI through when the target has no selectors (plain proxy)', async () => {
    const enrich = vi.fn(async (): Promise<TargetEnrichment | null> => ({
      abi: [
        { type: 'function', name: 'transfer', inputs: [{ type: 'address' }, { type: 'uint256' }] },
        { type: 'function', name: 'approve', inputs: [{ type: 'address' }, { type: 'uint256' }] },
      ],
    }))

    const [target] = await enrichTargets([singleImplTarget], enrich)
    expect(target.selectors).toBeUndefined()
    expect(target.abi).toHaveLength(2)
  })

  it('swallows per-target enricher errors', async () => {
    const enrich = vi.fn(async () => { throw new Error('network boom') })
    const targets = await enrichTargets(diamondTargets, enrich)
    expect(targets).toHaveLength(2)
    expect(targets[0].abi).toBeUndefined()
    expect(targets[1].abi).toBeUndefined()
  })

  it('preserves target order', async () => {
    const enrich = vi.fn(async () => ({ abi: [{ type: 'fallback' }] }))
    const targets = await enrichTargets(diamondTargets, enrich)
    expect(targets[0].address).toBe('0x' + 'aa'.repeat(20))
    expect(targets[1].address).toBe('0x' + 'bb'.repeat(20))
  })

  it('returns empty list for an empty input', async () => {
    expect(await enrichTargets([], null)).toEqual([])
  })
})
