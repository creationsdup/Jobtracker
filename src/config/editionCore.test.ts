import { describe, expect, it } from 'vitest'
import { featuresFor, filterByFeature, resolveEdition, type FeatureFlags, type FeatureKey } from './editionCore'

describe('resolveEdition', () => {
  it('retombe sur lite quand la variable est absente', () => {
    expect(resolveEdition(undefined)).toBe('lite')
  })

  it('retombe sur lite quand la variable est vide ou ne contient que des espaces', () => {
    expect(resolveEdition('')).toBe('lite')
    expect(resolveEdition('  ')).toBe('lite')
  })

  it('accepte lite et full', () => {
    expect(resolveEdition('lite')).toBe('lite')
    expect(resolveEdition('full')).toBe('full')
  })

  it('rejette toute autre valeur', () => {
    expect(() => resolveEdition('pro')).toThrow('VITE_EDITION invalide : "pro" (attendu : lite | full)')
  })
})

describe('featuresFor', () => {
  it("désactive les fonctionnalités complètes et active l'accès par code en lite", () => {
    expect(featuresFor('lite')).toEqual({ goals: false, library: false, ai: false, accessCode: true })
  })

  it('active les fonctionnalités complètes et garde les comptes classiques en full', () => {
    expect(featuresFor('full')).toEqual({ goals: true, library: true, ai: true, accessCode: false })
  })
})

describe('filterByFeature', () => {
  const ITEMS: { id: string; feature?: FeatureKey }[] = [
    { id: 'home' },
    { id: 'goals', feature: 'goals' },
    { id: 'apps' },
    { id: 'library', feature: 'library' },
  ]
  const NONE: FeatureFlags = { goals: false, library: false, ai: false, accessCode: false }
  const ALL: FeatureFlags = { goals: true, library: true, ai: true, accessCode: true }

  it('ne garde que les entrées sans feature quand tout est désactivé', () => {
    expect(filterByFeature(ITEMS, NONE).map((item) => item.id)).toEqual(['home', 'apps'])
  })

  it("garde toute la liste dans l'ordre quand tout est activé", () => {
    expect(filterByFeature(ITEMS, ALL).map((item) => item.id)).toEqual(['home', 'goals', 'apps', 'library'])
  })

  it('garde les entrées sans feature et celles de la seule feature active', () => {
    expect(filterByFeature(ITEMS, { ...NONE, library: true }).map((item) => item.id)).toEqual(['home', 'apps', 'library'])
  })
})
