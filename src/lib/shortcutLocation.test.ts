import { describe, expect, it, vi } from 'vitest'
import { takeShortcutCode } from './shortcutLocation'

describe('takeShortcutCode', () => {
  it('extrait un code valide et nettoie l’adresse', () => {
    const replaceUrl = vi.fn()
    const code = takeShortcutCode({ hash: '#k7q2-m9xp-4rwd', pathname: '/path', search: '?x=1' }, replaceUrl)
    expect(code).toBe('K7Q2M9XP4RWD')
    expect(replaceUrl).toHaveBeenCalledWith('/path?x=1')
  })

  it('ignore un retour de lien magique sans nettoyer l’adresse', () => {
    const replaceUrl = vi.fn()
    const code = takeShortcutCode({ hash: '#access_token=abc', pathname: '/', search: '' }, replaceUrl)
    expect(code).toBe('')
    expect(replaceUrl).not.toHaveBeenCalled()
  })

  it('renvoie une chaîne vide sans fragment', () => {
    const replaceUrl = vi.fn()
    expect(takeShortcutCode({ hash: '', pathname: '/', search: '' }, replaceUrl)).toBe('')
    expect(replaceUrl).not.toHaveBeenCalled()
  })
})
