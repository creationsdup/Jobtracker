import { describe, expect, it } from 'vitest'
import { contractLabel, detailsSummary, offerLinkLabel, stepCountLabel } from './applicationSummary'

describe('offerLinkLabel', () => {
  it('raccourcit le lien de l’offre pour l’affichage', () => {
    expect(offerLinkLabel('https://www.jobs.airbus.com/offre/123/')).toBe('jobs.airbus.com/offre/123')
    expect(offerLinkLabel('http://careers.example.com')).toBe('careers.example.com')
  })
})

describe('contractLabel', () => {
  it('affiche le libellé lisible d’un contrat standard, quelle que soit la casse', () => {
    expect(contractLabel('STAGE')).toBe('Stage')
    expect(contractLabel('alternance')).toBe('Alternance')
  })

  it('garde tel quel un contrat hors liste et renvoie null sans contrat', () => {
    expect(contractLabel('Freelance')).toBe('Freelance')
    expect(contractLabel(null)).toBeNull()
    expect(contractLabel('  ')).toBeNull()
  })
})

describe('detailsSummary', () => {
  it('résume le lieu et le contrat', () => {
    expect(detailsSummary({ location: 'Toulouse', contractType: 'CDI' })).toBe('Toulouse · CDI')
    expect(detailsSummary({ location: null, contractType: 'STAGE' })).toBe('Stage')
    expect(detailsSummary({ location: null, contractType: null })).toBe('')
  })
})

describe('stepCountLabel', () => {
  it('accorde le nombre d’étapes', () => {
    expect(stepCountLabel(0)).toBe('Aucune étape')
    expect(stepCountLabel(1)).toBe('1 étape')
    expect(stepCountLabel(3)).toBe('3 étapes')
  })
})
