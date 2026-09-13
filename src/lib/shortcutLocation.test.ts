import { describe, expect, it, vi } from 'vitest'
import { createShortcutCodeStore, takeShortcutCode } from './shortcutLocation'

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

describe('createShortcutCodeStore', () => {
  function fakeStore() {
    let reads = 0
    const readLocation = vi.fn(() => {
      reads += 1
      return { hash: '#k7q2-m9xp-4rwd', pathname: '/path', search: '' }
    })
    const replaceUrl = vi.fn()
    const store = createShortcutCodeStore(readLocation, replaceUrl)
    return { store, readLocation, replaceUrl, reads: () => reads }
  }

  it('ne lit la position qu’une fois et renvoie le même code aux appels suivants', () => {
    const { store, readLocation, replaceUrl, reads } = fakeStore()
    expect(store.take()).toBe('K7Q2M9XP4RWD')
    expect(store.take()).toBe('K7Q2M9XP4RWD')
    expect(reads()).toBe(1)
    expect(readLocation).toHaveBeenCalledTimes(1)
    expect(replaceUrl).toHaveBeenCalledTimes(1)
  })

  it('clear() vide le cache sans relire la position ni nettoyer à nouveau l’adresse', () => {
    const { store, readLocation, replaceUrl, reads } = fakeStore()
    expect(store.take()).toBe('K7Q2M9XP4RWD')
    store.clear()
    expect(store.take()).toBe('')
    expect(reads()).toBe(1)
    expect(readLocation).toHaveBeenCalledTimes(1)
    expect(replaceUrl).toHaveBeenCalledTimes(1)
  })
})
