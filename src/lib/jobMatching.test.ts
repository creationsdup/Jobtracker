import { describe, it, expect } from 'vitest'
import { normalizeText, containsPhrase, eitherContains } from './jobMatching'

describe('normalizeText', () => {
  it('lowercases and strips accents', () => {
    expect(normalizeText('Île-de-France')).toBe('ile-de-france')
  })

  it('collapses multiple spaces and trims', () => {
    expect(normalizeText('  Chef   de Projet  ')).toBe('chef de projet')
  })

  it('strips punctuation but keeps hyphens and digits', () => {
    expect(normalizeText('Graduate Program - Exploitation F/H')).toBe('graduate program - exploitation f h')
  })
})

describe('containsPhrase', () => {
  it('matches a whole word', () => {
    expect(containsPhrase('Maintenance préventive et corrective', 'maintenance')).toBe(true)
  })

  it('does not match a substring that is not a whole word', () => {
    expect(containsPhrase('Maintenance préventive et corrective des équipements industriels', 'industrie')).toBe(false)
  })

  it('matches a multi-word phrase with accents in the haystack', () => {
    expect(containsPhrase('Pilotage de projets innovants, coordination, stratégie et gouvernance.', 'stratégie')).toBe(true)
  })

  it('returns false for an empty phrase', () => {
    expect(containsPhrase('anything', '')).toBe(false)
  })
})

describe('eitherContains', () => {
  it('matches when the shorter string is a substring of the longer one', () => {
    expect(eitherContains('CDI', 'CDI-Graduate Program')).toBe(true)
    expect(eitherContains('CDI-Graduate Program', 'CDI')).toBe(true)
  })

  it('matches city aliases regardless of accents/case', () => {
    expect(eitherContains('Courbevoie, France', 'courbevoie')).toBe(true)
  })

  it('returns false when neither contains the other', () => {
    expect(eitherContains('Lyon', 'Paris')).toBe(false)
  })

  it('returns false for empty input', () => {
    expect(eitherContains('', 'Paris')).toBe(false)
  })
})

import { calculateJobMatch, applicationToJobMatchInput } from './jobMatching'
import type { UserGoal } from '@/lib/types'
import type { Application } from '@/lib/types'

const objective: UserGoal = {
  id: 'g1',
  user_id: 'u1',
  target_title: 'Chef de projet innovation / PMO / Graduate Program',
  target_roles: [
    'chef de projet', 'PMO', 'chargé de projet', 'graduate program',
    'project manager', 'business analyst', 'innovation manager',
  ],
  contract_types: ['CDI', 'Graduate Program', 'VIE', 'Alternance stratégique'],
  locations: ['Paris', 'Île-de-France', 'Courbevoie', 'Puteaux', 'La Défense', 'France'],
  target_companies: ['SNCF', 'Transdev', 'Keolis', 'EssilorLuxottica', 'RATP', 'Alstom'],
  sectors: ['transport', 'mobilité', 'innovation', 'industrie', 'R&D', 'stratégie', 'transformation', 'management de projet'],
  keywords_wanted: [
    'chef de projet', 'gestion de projet', 'PMO', 'innovation', 'coordination',
    'gouvernance', 'stratégie', 'pilotage', 'transformation', 'amélioration continue',
    'management de projet', 'graduate program',
  ],
  keywords_excluded: [
    'logistique pure', 'vente terrain', 'commercial uniquement', 'opérateur',
    'technicien maintenance', 'manutention', 'préparateur de commandes',
  ],
  experience_level: ['junior', 'graduate', 'jeune diplômé', '0-2 ans', 'débutant accepté'],
  scoring_priorities: null,
  target_date: '2027-06-01',
  personal_target: 10,
  is_active: true,
  created_at: '', updated_at: '',
}

describe('calculateJobMatch — the 4 reference scenarios', () => {
  it('scores a strong match high (Keolis Graduate Program)', () => {
    const result = calculateJobMatch({
      title: 'Graduate Program - Exploitation F/H',
      company: 'Keolis',
      location: 'Courbevoie, France',
      contract: 'CDI',
      text: 'Graduate program dans le secteur du transport avec management opérationnel.',
    }, objective)
    expect(result.totalScore).toBeGreaterThanOrEqual(75)
    expect(result.totalScore).toBeLessThanOrEqual(90)
    expect(result.level).toBe('Très cohérent')
  })

  it('scores a partial match medium (Amazon logistics junior)', () => {
    const result = calculateJobMatch({
      title: "Responsable d'équipe logistique junior",
      company: 'Amazon',
      location: 'Noisy-le-Grand',
      contract: 'CDI',
      text: "Management d'équipe logistique, préparation de commandes, suivi opérationnel.",
    }, objective)
    expect(result.totalScore).toBeGreaterThanOrEqual(35)
    expect(result.totalScore).toBeLessThanOrEqual(55)
  })

  it('scores a very strong match high (EssilorLuxottica chef de projet)', () => {
    const result = calculateJobMatch({
      title: 'Chef de projet innovation',
      company: 'EssilorLuxottica',
      location: 'Paris',
      contract: 'CDI',
      text: 'Pilotage de projets innovants, coordination, stratégie et gouvernance.',
    }, objective)
    expect(result.totalScore).toBeGreaterThanOrEqual(85)
    expect(result.level).toBe('Très cohérent')
  })

  it('scores an off-target offer low, never zero (technicien maintenance)', () => {
    const result = calculateJobMatch({
      title: 'Technicien maintenance industrielle',
      company: 'Entreprise inconnue',
      location: 'Lyon',
      contract: 'CDI',
      text: 'Maintenance préventive et corrective des équipements industriels.',
    }, objective)
    expect(result.totalScore).toBeGreaterThanOrEqual(20)
    expect(result.totalScore).toBeLessThanOrEqual(40)
    expect(result.totalScore).toBeGreaterThan(0)
    expect(result.warnings.some((w) => w.toLowerCase().includes('technicien maintenance'))).toBe(true)
  })
})

describe('calculateJobMatch — missing data never forces a 0', () => {
  const emptyObjective: UserGoal = {
    ...objective,
    target_roles: [], contract_types: [], locations: [], target_companies: [],
    sectors: [], keywords_wanted: [], keywords_excluded: [], experience_level: [],
    target_title: null,
  }

  it('returns neutral 50s and missingData entries when the objective defines nothing', () => {
    const result = calculateJobMatch({
      title: 'Quelconque', company: 'Quelconque', location: null, contract: null, text: '',
    }, emptyObjective)
    expect(result.categoryScores.title).toBe(50)
    expect(result.categoryScores.contract).toBe(50)
    expect(result.categoryScores.location).toBe(50)
    expect(result.categoryScores.sector).toBe(50)
    expect(result.categoryScores.experience).toBe(50)
    expect(result.missingData.length).toBeGreaterThan(0)
    expect(result.confidence).toBe('Faible')
    expect(result.totalScore).toBeGreaterThan(0)
  })

  it('never scores 0 for a missing location alone, even with a fully-defined objective', () => {
    const result = calculateJobMatch({
      title: 'Chef de projet innovation', company: 'Keolis', location: null, contract: 'CDI',
      text: 'Pilotage de projets, coordination, stratégie.',
    }, objective)
    expect(result.categoryScores.location).toBe(50)
    expect(result.missingData.some((m) => m.toLowerCase().includes('localisation'))).toBe(true)
  })
})

describe('applicationToJobMatchInput', () => {
  it('maps Application fields and folds notes into text', () => {
    const app: Application = {
      id: 'a1', userId: 'u1', company: 'Keolis', position: 'Graduate Program',
      location: 'Courbevoie', jobUrl: null, status: 'APPLIED', contractType: 'CDI',
      notes: 'Secteur transport', appliedAt: null, createdAt: '', updatedAt: '',
    }
    const job = applicationToJobMatchInput(app)
    expect(job.title).toBe('Graduate Program')
    expect(job.company).toBe('Keolis')
    expect(job.location).toBe('Courbevoie')
    expect(job.contract).toBe('CDI')
    expect(job.text).toContain('Graduate Program')
    expect(job.text).toContain('Secteur transport')
  })
})
