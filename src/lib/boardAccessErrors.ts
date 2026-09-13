// Messages d'erreur de l'accès par code — textes de la spec 2026-09-13-lite-access-code-design.md §3.
export const MESSAGES = {
  invalidFormat: 'Le code fait 12 caractères (chiffres et lettres).',
  invalidCode: 'Ce code ne correspond à aucun tableau. Vérifie les caractères.',
  tooManyAttempts: 'Trop de tentatives. Réessaie dans quelques minutes.',
  network: 'Impossible de joindre JobTracker. Réessaie.',
  createFailed: 'Impossible de créer le tableau. Réessaie.',
  createRateLimited: 'Trop de tableaux créés depuis ce réseau. Réessaie plus tard.',
  magicLinkRateLimited: 'Trop de demandes. Réessaie dans une minute.',
  emailTaken: 'Cet email est déjà utilisé par un autre compte.',
  emailInvalid: "Cet email n'est pas valide.",
  actionFailed: 'Une erreur est survenue. Réessaie.',
} as const

export type BoardAction = 'open' | 'create' | 'rotate' | 'delete'

const RATE_LIMIT_CODES = new Set(['over_email_send_rate_limit', 'over_request_rate_limit'])

export function messageForFunctionError(action: BoardAction, status: number | null): string {
  if (action === 'open') {
    if (status === 400) return MESSAGES.invalidFormat
    if (status === 401) return MESSAGES.invalidCode
    if (status === 429) return MESSAGES.tooManyAttempts
    return MESSAGES.network
  }
  if (action === 'create') return status === 429 ? MESSAGES.createRateLimited : MESSAGES.createFailed
  return status === 429 ? MESSAGES.tooManyAttempts : MESSAGES.actionFailed
}

export function messageForMagicLinkError(status: number | undefined, code: string | undefined): string | null {
  // WHY: un email sans tableau doit afficher le même écran qu'un envoi réussi.
  if (code === 'otp_disabled' || code === 'user_not_found') return null
  if (status === 429 || (code !== undefined && RATE_LIMIT_CODES.has(code))) return MESSAGES.magicLinkRateLimited
  return MESSAGES.network
}

export function messageForEmailChangeError(status: number | undefined, code: string | undefined): string {
  if (code === 'email_exists') return MESSAGES.emailTaken
  if (code === 'email_address_invalid' || code === 'validation_failed') return MESSAGES.emailInvalid
  if (status === 429 || (code !== undefined && RATE_LIMIT_CODES.has(code))) return MESSAGES.magicLinkRateLimited
  return MESSAGES.network
}

export function isPlausibleEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}
