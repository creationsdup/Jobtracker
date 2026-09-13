import { describe, expect, it } from 'vitest'
import { mergePendingSteps, resolveStatusChange } from './pendingSteps'
import type { TimelineStep } from './types'

function step(id: string, fields: Partial<TimelineStep> = {}): TimelineStep {
  return {
    id,
    applicationId: 'app-1',
    title: 'Étape',
    date: '2026-09-12',
    time: null,
    notes: null,
    status: 'COMPLETED',
    order: 0,
    createdAt: '',
    ...fields,
  }
}

describe('mergePendingSteps', () => {
  it('renvoie la même liste quand aucune étape n’attend le serveur', () => {
    const steps = [step('a')]
    expect(mergePendingSteps(steps, [])).toBe(steps)
  })

  it('affiche tout de suite les étapes en attente, triées par date', () => {
    const steps = [step('a', { date: '2026-09-10' }), step('c', { date: '2026-09-20' })]
    const merged = mergePendingSteps(steps, [step('b', { date: '2026-09-15' })])
    expect(merged.map((s) => s.id)).toEqual(['a', 'b', 'c'])
  })

  it('n’affiche pas deux fois une étape déjà confirmée par le serveur', () => {
    const steps = [step('a'), step('b')]
    expect(mergePendingSteps(steps, [step('b')]).map((s) => s.id)).toEqual(['a', 'b'])
  })
})

describe('resolveStatusChange', () => {
  it('prend le statut demandé explicitement', () => {
    expect(resolveStatusChange('APPLIED', [step('a', { title: 'Étape' })], 'OFFER')).toBe('OFFER')
  })

  it('déduit le statut de la dernière étape', () => {
    expect(resolveStatusChange('APPLIED', [step('a', { title: 'Entretien RH' })])).toBe('INTERVIEW')
  })

  it('repasse « À postuler » quand il ne reste aucune étape', () => {
    expect(resolveStatusChange('APPLIED', [])).toBe('WISHLIST')
  })

  it('ne change rien quand le statut est déjà le bon ou impossible à déduire', () => {
    expect(resolveStatusChange('INTERVIEW', [step('a', { title: 'Entretien RH' })])).toBeNull()
    expect(resolveStatusChange('APPLIED', [step('a', { title: 'Café avec Claire' })])).toBeNull()
  })
})
