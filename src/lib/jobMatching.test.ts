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
