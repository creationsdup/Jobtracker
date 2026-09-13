import { describe, expect, it } from 'vitest'
import { computeBoardSummary } from './boardSummary'
import type { Application } from './types'

const NOW = Date.UTC(2026, 8, 13, 12)
const daysAgo = (days: number) => new Date(NOW - days * 86_400_000).toISOString()

function app(fields: Partial<Application>): Application {
  return { createdAt: daysAgo(0), updatedAt: daysAgo(0), ...fields } as Application
}

describe('computeBoardSummary', () => {
  it('compte les candidatures en cours, les entretiens et les offres', () => {
    const summary = computeBoardSummary(
      [
        app({ status: 'WISHLIST' }),
        app({ status: 'APPLIED' }),
        app({ status: 'INTERVIEW' }),
        app({ status: 'TECHNICAL_TEST' }),
        app({ status: 'OFFER' }),
        app({ status: 'ACCEPTED' }),
        app({ status: 'REJECTED' }),
      ],
      NOW,
    )
    expect(summary).toEqual({ active: 3, interviews: 2, offers: 2, followUps: 0 })
  })

  it('demande une relance pour une candidature postulée depuis 7 jours ou plus', () => {
    const summary = computeBoardSummary(
      [
        app({ status: 'APPLIED', appliedAt: daysAgo(7) }),
        app({ status: 'APPLIED', appliedAt: daysAgo(6) }),
        app({ status: 'APPLIED', updatedAt: daysAgo(10) }),
        app({ status: 'INTERVIEW', appliedAt: daysAgo(30) }),
      ],
      NOW,
    )
    expect(summary.followUps).toBe(2)
  })
})
