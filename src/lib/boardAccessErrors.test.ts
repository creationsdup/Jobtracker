import { describe, expect, it } from 'vitest'
import {
  MESSAGES,
  isPlausibleEmail,
  messageForEmailChangeError,
  messageForFunctionError,
  messageForMagicLinkError,
} from './boardAccessErrors'

describe('messageForFunctionError', () => {
  it('traduit les erreurs d\'ouverture', () => {
    expect(messageForFunctionError('open', 400)).toBe(MESSAGES.invalidFormat)
    expect(messageForFunctionError('open', 401)).toBe(MESSAGES.invalidCode)
    expect(messageForFunctionError('open', 429)).toBe(MESSAGES.tooManyAttempts)
    expect(messageForFunctionError('open', 500)).toBe(MESSAGES.network)
    expect(messageForFunctionError('open', null)).toBe(MESSAGES.network)
  })

  it('traduit les erreurs de création', () => {
    expect(messageForFunctionError('create', 429)).toBe(MESSAGES.createRateLimited)
    expect(messageForFunctionError('create', 500)).toBe(MESSAGES.createFailed)
    expect(messageForFunctionError('create', null)).toBe(MESSAGES.createFailed)
  })

  it('traduit les erreurs de nouveau code et de suppression', () => {
    expect(messageForFunctionError('rotate', 429)).toBe(MESSAGES.tooManyAttempts)
    expect(messageForFunctionError('rotate', 404)).toBe(MESSAGES.actionFailed)
    expect(messageForFunctionError('delete', null)).toBe(MESSAGES.actionFailed)
  })

  it('reprend mot pour mot les textes de la spec', () => {
    expect(MESSAGES.invalidFormat).toBe('Le code fait 12 caractères (chiffres et lettres).')
    expect(MESSAGES.invalidCode).toBe('Ce code ne correspond à aucun tableau. Vérifie les caractères.')
    expect(MESSAGES.tooManyAttempts).toBe('Trop de tentatives. Réessaie dans quelques minutes.')
    expect(MESSAGES.network).toBe('Impossible de joindre JobTracker. Réessaie.')
    expect(MESSAGES.createFailed).toBe('Impossible de créer le tableau. Réessaie.')
    expect(MESSAGES.createRateLimited).toBe('Trop de tableaux créés depuis ce réseau. Réessaie plus tard.')
    expect(MESSAGES.magicLinkRateLimited).toBe('Trop de demandes. Réessaie dans une minute.')
    expect(MESSAGES.emailTaken).toBe('Cet email est déjà utilisé par un autre compte.')
    expect(MESSAGES.emailInvalid).toBe("Cet email n'est pas valide.")
  })
})

describe('messageForMagicLinkError', () => {
  it('ne révèle pas qu\'un email est inconnu', () => {
    expect(messageForMagicLinkError(422, 'otp_disabled')).toBeNull()
    expect(messageForMagicLinkError(404, 'user_not_found')).toBeNull()
  })

  it('signale la limite d\'envoi', () => {
    expect(messageForMagicLinkError(429, 'over_email_send_rate_limit')).toBe(MESSAGES.magicLinkRateLimited)
    expect(messageForMagicLinkError(429, undefined)).toBe(MESSAGES.magicLinkRateLimited)
  })

  it('traduit le reste en erreur réseau', () => {
    expect(messageForMagicLinkError(undefined, undefined)).toBe(MESSAGES.network)
    expect(messageForMagicLinkError(500, 'unexpected_failure')).toBe(MESSAGES.network)
  })
})

describe('messageForEmailChangeError', () => {
  it('signale un email déjà utilisé', () => {
    expect(messageForEmailChangeError(422, 'email_exists')).toBe(MESSAGES.emailTaken)
  })

  it('signale un email refusé', () => {
    expect(messageForEmailChangeError(400, 'email_address_invalid')).toBe(MESSAGES.emailInvalid)
    expect(messageForEmailChangeError(422, 'validation_failed')).toBe(MESSAGES.emailInvalid)
  })

  it('signale la limite d\'envoi', () => {
    expect(messageForEmailChangeError(429, 'over_email_send_rate_limit')).toBe(MESSAGES.magicLinkRateLimited)
  })

  it('traduit le reste en erreur réseau', () => {
    expect(messageForEmailChangeError(undefined, undefined)).toBe(MESSAGES.network)
  })
})

describe('isPlausibleEmail', () => {
  it('accepte un email courant', () => {
    expect(isPlausibleEmail('prenom@exemple.fr')).toBe(true)
  })

  it('refuse une saisie sans @, sans domaine ou avec espace', () => {
    expect(isPlausibleEmail('prenom')).toBe(false)
    expect(isPlausibleEmail('prenom@exemple')).toBe(false)
    expect(isPlausibleEmail('pre nom@exemple.fr')).toBe(false)
  })
})
