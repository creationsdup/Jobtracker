import { describe, expect, it } from 'vitest'
import { createSavedAccessCode, type CodeStorage } from './savedAccessCode'

function memoryStorage(initial: Record<string, string> = {}): CodeStorage & { dump(): Record<string, string> } {
  const items = new Map(Object.entries(initial))
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => { items.set(key, value) },
    removeItem: (key) => { items.delete(key) },
    dump: () => Object.fromEntries(items),
  }
}

function brokenStorage(): CodeStorage {
  const fail = () => { throw new Error('stockage indisponible') }
  return { getItem: fail, setItem: fail, removeItem: fail }
}

function savedWith(storage: CodeStorage) {
  return createSavedAccessCode(() => storage)
}

describe('createSavedAccessCode', () => {
  it('rend le code normalisé au tableau qui l’a enregistré', () => {
    const saved = savedWith(memoryStorage())
    saved.save('user-a', 'k7q2-m9xp-4rwd')
    expect(saved.read('user-a')).toBe('K7Q2M9XP4RWD')
  })

  it('ne rend jamais le code d’un autre tableau', () => {
    const saved = savedWith(memoryStorage())
    saved.save('user-a', 'K7Q2M9XP4RWD')
    expect(saved.read('user-a')).toBe('K7Q2M9XP4RWD')
    expect(saved.read('user-b')).toBeNull()
  })

  it('remplace l’ancien code après un nouveau code', () => {
    const saved = savedWith(memoryStorage())
    saved.save('user-a', 'K7Q2M9XP4RWD')
    saved.save('user-a', 'HT3N8VZB6CFE')
    expect(saved.read('user-a')).toBe('HT3N8VZB6CFE')
  })

  it('oublie le code après clear()', () => {
    const storage = memoryStorage()
    const saved = savedWith(storage)
    saved.save('user-a', 'K7Q2M9XP4RWD')
    saved.clear()
    expect(saved.read('user-a')).toBeNull()
    expect(storage.dump()).toEqual({})
  })

  it('n’enregistre pas une valeur qui n’est pas un code valide', () => {
    const storage = memoryStorage()
    const saved = savedWith(storage)
    saved.save('user-a', 'pas-un-code')
    expect(saved.read('user-a')).toBeNull()
    expect(storage.dump()).toEqual({})
  })

  it.each([
    ['du texte qui n’est pas du JSON', 'oups'],
    ['un code invalide', JSON.stringify({ userId: 'user-a', code: 'OOOO' })],
    ['un objet incomplet', JSON.stringify({ code: 'K7Q2M9XP4RWD' })],
  ])('ignore une valeur stockée corrompue : %s', (_label, raw) => {
    const saved = savedWith(memoryStorage({ 'jobtracker-board-code': raw }))
    expect(saved.read('user-a')).toBeNull()
  })

  it('reste silencieux quand le stockage du navigateur est indisponible', () => {
    const saved = savedWith(brokenStorage())
    expect(() => saved.save('user-a', 'K7Q2M9XP4RWD')).not.toThrow()
    expect(saved.read('user-a')).toBeNull()
    expect(() => saved.clear()).not.toThrow()
  })
})
