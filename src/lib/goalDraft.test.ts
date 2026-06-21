import { describe, it, expect } from 'vitest'
import { mapGeneratedGoalToDraft, CONTRACT_OPTIONS, targetDateFromOption } from './goalDraft'
import type { GeneratedGoal } from './ai'

function baseGenerated(overrides: Partial<GeneratedGoal> = {}): GeneratedGoal {
  return {
    target_title: null,
    target_roles: [],
    contract_types: [],
    locations: [],
    target_companies: [],
    sectors: [],
    keywords_wanted: [],
    keywords_excluded: [],
    experience_level: [],
    scoring_priorities: null,
    timeline: null,
    personal_target: null,
    ...overrides,
  }
}

describe('mapGeneratedGoalToDraft', () => {
  it('converts each timeline bucket to the matching target_date', () => {
    for (const bucket of ['1m', '3m', '6m', '12m'] as const) {
      const draft = mapGeneratedGoalToDraft(baseGenerated({ timeline: bucket }))
      expect(draft.target_date).toBe(targetDateFromOption(bucket))
    }
  })

  it('leaves target_date null when timeline is null', () => {
    const draft = mapGeneratedGoalToDraft(baseGenerated({ timeline: null }))
    expect(draft.target_date).toBeNull()
  })

  it('filters out contract_types not in CONTRACT_OPTIONS', () => {
    const draft = mapGeneratedGoalToDraft(baseGenerated({ contract_types: ['CDI', 'Vacation', 'Freelance'] }))
    expect(draft.contract_types).toEqual(['CDI', 'Freelance'])
  })

  it('keeps all valid contract_types', () => {
    const draft = mapGeneratedGoalToDraft(baseGenerated({ contract_types: [...CONTRACT_OPTIONS] }))
    expect(draft.contract_types).toEqual(CONTRACT_OPTIONS)
  })

  it('passes through empty/null fields without inventing defaults', () => {
    const draft = mapGeneratedGoalToDraft(baseGenerated())
    expect(draft.target_title).toBeNull()
    expect(draft.target_roles).toEqual([])
    expect(draft.locations).toEqual([])
    expect(draft.target_companies).toEqual([])
    expect(draft.sectors).toEqual([])
    expect(draft.keywords_wanted).toEqual([])
    expect(draft.keywords_excluded).toEqual([])
    expect(draft.experience_level).toEqual([])
    expect(draft.scoring_priorities).toBeNull()
    expect(draft.personal_target).toBeNull()
  })

  it('passes through populated array/string/number fields unchanged', () => {
    const draft = mapGeneratedGoalToDraft(baseGenerated({
      target_title: 'Chef de projet innovation',
      target_roles: ['Chef de projet', 'PMO'],
      locations: ['Paris'],
      target_companies: ['SNCF'],
      sectors: ['Transport'],
      keywords_wanted: ['pilotage'],
      keywords_excluded: ['manutention'],
      experience_level: ['junior'],
      scoring_priorities: 'Je privilégie le secteur transport.',
      personal_target: 8,
    }))
    expect(draft.target_title).toBe('Chef de projet innovation')
    expect(draft.target_roles).toEqual(['Chef de projet', 'PMO'])
    expect(draft.locations).toEqual(['Paris'])
    expect(draft.target_companies).toEqual(['SNCF'])
    expect(draft.sectors).toEqual(['Transport'])
    expect(draft.keywords_wanted).toEqual(['pilotage'])
    expect(draft.keywords_excluded).toEqual(['manutention'])
    expect(draft.experience_level).toEqual(['junior'])
    expect(draft.scoring_priorities).toBe('Je privilégie le secteur transport.')
    expect(draft.personal_target).toBe(8)
  })

  it('defaults array fields to [] when the AI response omits them entirely (malformed JSON)', () => {
    const malformed = baseGenerated() as unknown as Record<string, unknown>
    delete malformed.target_roles
    delete malformed.contract_types
    delete malformed.locations
    delete malformed.target_companies
    delete malformed.sectors
    delete malformed.keywords_wanted
    delete malformed.keywords_excluded
    delete malformed.experience_level
    const draft = mapGeneratedGoalToDraft(malformed as unknown as GeneratedGoal)
    expect(draft.target_roles).toEqual([])
    expect(draft.contract_types).toEqual([])
    expect(draft.locations).toEqual([])
    expect(draft.target_companies).toEqual([])
    expect(draft.sectors).toEqual([])
    expect(draft.keywords_wanted).toEqual([])
    expect(draft.keywords_excluded).toEqual([])
    expect(draft.experience_level).toEqual([])
  })

  it('defaults array fields to [] when the AI returns a non-array (e.g. a string) instead', () => {
    const malformed = baseGenerated({
      target_roles: 'Chef de projet' as unknown as string[],
      keywords_wanted: { not: 'an array' } as unknown as string[],
    })
    const draft = mapGeneratedGoalToDraft(malformed)
    expect(draft.target_roles).toEqual([])
    expect(draft.keywords_wanted).toEqual([])
  })

  it('filters out non-string entries inside an otherwise-valid array', () => {
    const malformed = baseGenerated({
      target_roles: ['Chef de projet', 42, null] as unknown as string[],
    })
    const draft = mapGeneratedGoalToDraft(malformed)
    expect(draft.target_roles).toEqual(['Chef de projet'])
  })

  it('defaults target_title to null when it is not a string', () => {
    const malformed = baseGenerated({ target_title: 123 as unknown as string })
    const draft = mapGeneratedGoalToDraft(malformed)
    expect(draft.target_title).toBeNull()
  })

  it('defaults scoring_priorities to null when it is not a string', () => {
    const malformed = baseGenerated({ scoring_priorities: ['not', 'a', 'string'] as unknown as string })
    const draft = mapGeneratedGoalToDraft(malformed)
    expect(draft.scoring_priorities).toBeNull()
  })

  it('defaults personal_target to null when it is not a number', () => {
    const malformed = baseGenerated({ personal_target: '8' as unknown as number })
    const draft = mapGeneratedGoalToDraft(malformed)
    expect(draft.personal_target).toBeNull()
  })

  it('defaults target_date to null when timeline is an invalid/unexpected value', () => {
    const malformed = baseGenerated({ timeline: 'next month' as unknown as GeneratedGoal['timeline'] })
    const draft = mapGeneratedGoalToDraft(malformed)
    expect(draft.target_date).toBeNull()
  })
})

describe('targetDateFromOption', () => {
  it('adds the right number of months for each bucket', () => {
    const now = new Date()
    const expectedMonths: Record<string, number> = { '1m': 1, '3m': 3, '6m': 6, '12m': 12 }
    for (const [bucket, months] of Object.entries(expectedMonths)) {
      const expected = new Date(now)
      expected.setMonth(expected.getMonth() + months)
      expect(targetDateFromOption(bucket)).toBe(expected.toISOString().slice(0, 10))
    }
  })
})
