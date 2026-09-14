import { describe, expect, it } from 'vitest'
import { LEGAL_PAGES, legalPageFromPath } from './legalRoutes'

describe('legalPageFromPath', () => {
  it('reconnaît chaque page légale', () => {
    expect(legalPageFromPath('/cgu')).toBe('terms')
    expect(legalPageFromPath('/confidentialite')).toBe('privacy')
    expect(legalPageFromPath('/contact')).toBe('contact')
  })

  it('tolère une barre finale et les majuscules', () => {
    expect(legalPageFromPath('/cgu/')).toBe('terms')
    expect(legalPageFromPath('/Confidentialite')).toBe('privacy')
  })

  it('ignore les autres adresses', () => {
    for (const path of ['/', '', '/mon-tableau', '/cgu/autre', '/contacts']) {
      expect(legalPageFromPath(path)).toBeNull()
    }
  })

  it('fait mener chaque lien du pied de page à sa page', () => {
    for (const page of LEGAL_PAGES) expect(legalPageFromPath(page.path)).toBe(page.id)
  })
})
