import type { Locale } from './i18n/translations'

interface SupabaseAuthErrorLike {
  message?: string
  code?: string
}

const MESSAGES: Record<string, { fr: string; en: string }> = {
  invalid_credentials: {
    fr: 'Email ou mot de passe incorrect.',
    en: 'Incorrect email or password.',
  },
  user_already_exists: {
    fr: 'Un compte existe déjà avec cet email.',
    en: 'An account with this email already exists.',
  },
  weak_password: {
    fr: 'Le mot de passe doit contenir au moins 6 caractères.',
    en: 'Password must be at least 6 characters long.',
  },
  email_address_invalid: {
    fr: "Cette adresse email n'est pas valide.",
    en: 'This email address is not valid.',
  },
  email_not_confirmed: {
    fr: 'Veuillez confirmer votre email avant de vous connecter.',
    en: 'Please confirm your email before signing in.',
  },
  over_email_send_rate_limit: {
    fr: "Trop de tentatives. Réessayez dans quelques minutes.",
    en: 'Too many attempts. Please try again in a few minutes.',
  },
  over_request_rate_limit: {
    fr: "Trop de tentatives. Réessayez dans quelques minutes.",
    en: 'Too many attempts. Please try again in a few minutes.',
  },
  same_password: {
    fr: "Le nouveau mot de passe doit être différent de l'ancien.",
    en: 'The new password must be different from the old one.',
  },
  signup_disabled: {
    fr: "Les inscriptions sont désactivées pour le moment.",
    en: 'Signups are currently disabled.',
  },
}

// Older supabase-js versions don't always set `code`; fall back to matching
// on the raw English message they return.
const MESSAGE_PATTERNS: Array<[RegExp, keyof typeof MESSAGES]> = [
  [/invalid login credentials/i, 'invalid_credentials'],
  [/user already registered/i, 'user_already_exists'],
  [/password should be at least/i, 'weak_password'],
  [/unable to validate email address/i, 'email_address_invalid'],
  [/email not confirmed/i, 'email_not_confirmed'],
  [/email rate limit exceeded/i, 'over_email_send_rate_limit'],
  [/rate limit/i, 'over_request_rate_limit'],
  [/new password should be different/i, 'same_password'],
  [/signups? (is|are) disabled/i, 'signup_disabled'],
]

export function getAuthErrorMessage(error: SupabaseAuthErrorLike | null | undefined, locale: Locale): string {
  if (!error) return ''

  const byCode = error.code ? MESSAGES[error.code] : undefined
  if (byCode) return byCode[locale]

  const message = error.message ?? ''
  for (const [pattern, key] of MESSAGE_PATTERNS) {
    if (pattern.test(message)) return MESSAGES[key][locale]
  }

  return message
}
