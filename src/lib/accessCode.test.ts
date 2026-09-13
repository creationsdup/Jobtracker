import { describe, expect, it } from 'vitest'
import {
  ACCESS_CODE_ALPHABET,
  ACCESS_CODE_LENGTH,
  formatAccessCode,
  generateAccessCode,
  hashAccessCode,
  hmacSha256Hex,
  isBoardEmail,
  isValidAccessCode,
  normalizeAccessCode,
  parseShortcutHash,
} from './accessCode'

describe('ACCESS_CODE_ALPHABET', () => {
  it("contient 30 symboles distincts sans caractères ambigus", () => {
    expect(ACCESS_CODE_ALPHABET).toHaveLength(30)
    expect(new Set(ACCESS_CODE_ALPHABET).size).toBe(30)
    for (const char of '0O1ILU') expect(ACCESS_CODE_ALPHABET).not.toContain(char)
  })
})

describe('generateAccessCode', () => {
  it("produit un code valide de 12 symboles", () => {
    const code = generateAccessCode()
    expect(code).toHaveLength(ACCESS_CODE_LENGTH)
    expect(isValidAccessCode(code)).toBe(true)
  })

  it("produit 1 000 codes tous différents", () => {
    const codes = new Set(Array.from({ length: 1000 }, () => generateAccessCode()))
    expect(codes.size).toBe(1000)
  })
})

describe('normalizeAccessCode', () => {
  it("met en majuscules et retire espaces et tirets", () => {
    expect(normalizeAccessCode(' k7q2-m9xp 4rwd ')).toBe('K7Q2M9XP4RWD')
  })
})

describe('isValidAccessCode', () => {
  it("accepte 12 symboles de l'alphabet", () => {
    expect(isValidAccessCode('K7Q2M9XP4RWD')).toBe(true)
  })

  it("refuse une mauvaise longueur ou un symbole interdit", () => {
    expect(isValidAccessCode('K7Q2M9XP4RW')).toBe(false)
    expect(isValidAccessCode('K7Q2M9XP4RW0')).toBe(false)
  })
})

describe('formatAccessCode', () => {
  it("groupe par 4 avec des tirets", () => {
    expect(formatAccessCode('K7Q2M9XP4RWD')).toBe('K7Q2-M9XP-4RWD')
  })
})

describe('parseShortcutHash', () => {
  it("extrait un code valide du fragment", () => {
    expect(parseShortcutHash('#k7q2-m9xp-4rwd')).toBe('K7Q2M9XP4RWD')
  })

  it("ignore un retour de lien magique, un fragment vide ou un code invalide", () => {
    expect(parseShortcutHash('#access_token=abc&type=magiclink')).toBeNull()
    expect(parseShortcutHash('')).toBeNull()
    expect(parseShortcutHash('#')).toBeNull()
    expect(parseShortcutHash('#K7Q2-M9XP-4RW0')).toBeNull()
  })
})

describe('hmacSha256Hex / hashAccessCode', () => {
  it("calcule le HMAC-SHA-256 de référence", async () => {
    expect(await hmacSha256Hex('The quick brown fox jumps over the lazy dog', 'key'))
      .toBe('f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8')
  })

  it("est déterministe et dépend du pepper", async () => {
    const a = await hashAccessCode('K7Q2M9XP4RWD', 'pepper-a')
    expect(a).toMatch(/^[0-9a-f]{64}$/)
    expect(await hashAccessCode('K7Q2M9XP4RWD', 'pepper-a')).toBe(a)
    expect(await hashAccessCode('K7Q2M9XP4RWD', 'pepper-b')).not.toBe(a)
  })
})

describe('isBoardEmail', () => {
  it("reconnaît l'email technique d'un tableau, casse comprise", () => {
    expect(isBoardEmail('board-1@boards.jobtracker.invalid')).toBe(true)
    expect(isBoardEmail('BOARD-1@BOARDS.JOBTRACKER.INVALID')).toBe(true)
  })

  it("refuse un email réel ou absent", () => {
    expect(isBoardEmail('prenom@exemple.fr')).toBe(false)
    expect(isBoardEmail(null)).toBe(false)
    expect(isBoardEmail(undefined)).toBe(false)
  })
})
