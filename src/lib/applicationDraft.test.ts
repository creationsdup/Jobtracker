import { describe, expect, it } from 'vitest'
import {
  canSaveDraft,
  contractOptions,
  createDraft,
  initialSections,
  isContractSelected,
  isStatusSelected,
  localDateString,
  patchDraft,
  toPayload,
  toggleContract,
  withStatus,
} from './applicationDraft'
import type { Application } from './types'

function app(fields: Partial<Application>): Application {
  return {
    id: 'a1',
    userId: 'u1',
    company: 'Airbus',
    position: 'PMO Innovation',
    location: null,
    jobUrl: null,
    status: 'WISHLIST',
    contractType: null,
    notes: null,
    appliedAt: null,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    ...fields,
  }
}

const noLookup = () => undefined

describe('createDraft', () => {
  it('part d’un brouillon vide « À postuler » pour une nouvelle candidature', () => {
    expect(createDraft(null)).toEqual({
      company: '',
      position: '',
      jobUrl: '',
      companyWebsite: '',
      status: 'WISHLIST',
      appliedAt: '',
      location: '',
      contractType: '',
      notes: '',
    })
  })

  it('pré-remplit depuis la candidature et garde seulement le jour de la date de candidature', () => {
    const draft = createDraft(
      app({ status: 'APPLIED', location: 'Toulouse', contractType: 'CDI', jobUrl: 'https://jobs.airbus.com/1', notes: 'RH', appliedAt: '2026-06-01T08:30:00.000Z' }),
      'https://airbus.com',
    )
    expect(draft).toMatchObject({
      company: 'Airbus',
      position: 'PMO Innovation',
      status: 'APPLIED',
      location: 'Toulouse',
      contractType: 'CDI',
      jobUrl: 'https://jobs.airbus.com/1',
      notes: 'RH',
      appliedAt: '2026-06-01',
      companyWebsite: 'https://airbus.com',
    })
  })
})

describe('canSaveDraft', () => {
  it('exige une entreprise et un poste non vides, espaces ignorés', () => {
    expect(canSaveDraft({ ...createDraft(null), company: '   ', position: 'PM' })).toBe(false)
    expect(canSaveDraft({ ...createDraft(null), company: 'SNCF', position: 'PM' })).toBe(true)
  })
})

describe('patchDraft', () => {
  it('déduit le site de l’entreprise depuis un lien d’offre hors jobboard', () => {
    const next = patchDraft(createDraft(null), { jobUrl: 'https://careers.airbus.com/offre/1' }, noLookup)
    expect(next.companyWebsite).toBe('https://careers.airbus.com')
  })

  it('n’écrase pas un site déjà renseigné', () => {
    const prev = { ...createDraft(null), companyWebsite: 'https://airbus.com' }
    expect(patchDraft(prev, { jobUrl: 'https://careers.airbus.com/offre/1' }, noLookup).companyWebsite).toBe('https://airbus.com')
  })

  it('reprend le domaine connu de l’entreprise saisie', () => {
    const next = patchDraft(createDraft(null), { company: ' Airbus ' }, (name) => (name === 'Airbus' ? 'https://airbus.com' : undefined))
    expect(next.company).toBe(' Airbus ')
    expect(next.companyWebsite).toBe('https://airbus.com')
  })
})

describe('statut', () => {
  it('met la date du jour quand on passe à un statut postulé sans date', () => {
    expect(withStatus(createDraft(null), 'APPLIED', '2026-09-13')).toMatchObject({ status: 'APPLIED', appliedAt: '2026-09-13' })
  })

  it('garde une date de candidature déjà saisie', () => {
    const prev = { ...createDraft(null), appliedAt: '2026-09-01' }
    expect(withStatus(prev, 'INTERVIEW', '2026-09-13').appliedAt).toBe('2026-09-01')
  })

  it('allume la puce de la colonne correspondant à un ancien statut', () => {
    expect(isStatusSelected('PHONE_SCREEN', 'APPLIED')).toBe(true)
    expect(isStatusSelected('TECHNICAL_TEST', 'INTERVIEW')).toBe(true)
    expect(isStatusSelected('ACCEPTED', 'OFFER')).toBe(true)
    expect(isStatusSelected('WITHDRAWN', 'REJECTED')).toBe(true)
    expect(isStatusSelected('APPLIED', 'INTERVIEW')).toBe(false)
  })
})

describe('contrat', () => {
  it('propose les mêmes valeurs que l’ancien formulaire', () => {
    expect(contractOptions('')).toEqual([
      { value: 'CDI', label: 'CDI' },
      { value: 'CDD', label: 'CDD' },
      { value: 'STAGE', label: 'Stage' },
      { value: 'ALTERNANCE', label: 'Alternance' },
      { value: 'CDI-Graduate Program', label: 'CDI-Graduate Program' },
    ])
  })

  it('ajoute une ancienne valeur hors liste comme puce supplémentaire', () => {
    const options = contractOptions('Freelance')
    expect(options).toHaveLength(6)
    expect(options[5]).toEqual({ value: 'Freelance', label: 'Freelance' })
  })

  it('reconnaît une valeur standard quelle que soit la casse', () => {
    expect(contractOptions('alternance')).toHaveLength(5)
    expect(isContractSelected('alternance', 'ALTERNANCE')).toBe(true)
  })

  it('sélectionne une puce, puis la désélectionne au second clic', () => {
    expect(toggleContract('', 'CDD')).toBe('CDD')
    expect(toggleContract('CDD', 'CDI')).toBe('CDI')
    expect(toggleContract('CDI', 'CDI')).toBe('')
  })
})

describe('initialSections', () => {
  it('garde tout replié pour une nouvelle candidature', () => {
    expect(initialSections(createDraft(null))).toEqual({ details: false, notes: false })
  })

  it('ouvre seulement les sections qui contiennent déjà des infos', () => {
    expect(initialSections(createDraft(app({ location: 'Lille' })))).toEqual({ details: true, notes: false })
    expect(initialSections(createDraft(app({ notes: 'À relancer' })))).toEqual({ details: false, notes: true })
  })

  it('n’ouvre pas les détails pour le seul site de l’entreprise, déduit automatiquement', () => {
    expect(initialSections(createDraft(app({}), 'https://airbus.com')).details).toBe(false)
  })
})

describe('toPayload', () => {
  it('nettoie les champs et remplace les vides par null', () => {
    const draft = { ...createDraft(null), company: ' Airbus ', position: ' PMO ', location: '  ', notes: ' RH ', jobUrl: '' }
    expect(toPayload(draft, 'u1')).toEqual({
      userId: 'u1',
      company: 'Airbus',
      position: 'PMO',
      location: null,
      contractType: null,
      jobUrl: null,
      status: 'WISHLIST',
      notes: 'RH',
      appliedAt: null,
    })
  })

  it('n’enregistre pas de date de candidature pour une candidature « À postuler »', () => {
    const draft = { ...createDraft(null), company: 'A', position: 'B', appliedAt: '2026-09-13' }
    expect(toPayload(draft, 'u1').appliedAt).toBeNull()
    expect(toPayload({ ...draft, status: 'APPLIED' }, 'u1').appliedAt).toBe('2026-09-13')
  })
})

describe('localDateString', () => {
  it('formate la date locale en AAAA-MM-JJ', () => {
    expect(localDateString(new Date(2026, 8, 3, 23, 59))).toBe('2026-09-03')
  })
})
