// Module pur partagé entre le navigateur (via src/lib/accessCode.ts), les fonctions Deno et Vitest.
// Aucun import, aucune API Deno ni Node : Web Crypto uniquement.

export const ACCESS_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ'
export const ACCESS_CODE_LENGTH = 12
export const BOARD_EMAIL_DOMAIN = 'boards.jobtracker.invalid'

// WHY: 256 - (256 % 30) = 240 ; rejeter les octets >= 240 évite le biais du modulo.
const UNBIASED_BYTE_LIMIT = 256 - (256 % ACCESS_CODE_ALPHABET.length)

export function generateAccessCode(): string {
  let code = ''
  while (code.length < ACCESS_CODE_LENGTH) {
    const bytes = crypto.getRandomValues(new Uint8Array(ACCESS_CODE_LENGTH * 2))
    for (const byte of bytes) {
      if (byte >= UNBIASED_BYTE_LIMIT) continue
      code += ACCESS_CODE_ALPHABET[byte % ACCESS_CODE_ALPHABET.length]
      if (code.length === ACCESS_CODE_LENGTH) break
    }
  }
  return code
}

export function normalizeAccessCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export function isValidAccessCode(normalized: string): boolean {
  if (normalized.length !== ACCESS_CODE_LENGTH) return false
  for (const char of normalized) {
    if (!ACCESS_CODE_ALPHABET.includes(char)) return false
  }
  return true
}

export function formatAccessCode(normalized: string): string {
  return normalized.match(/.{1,4}/g)?.join('-') ?? ''
}

export function parseShortcutHash(hash: string): string | null {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  // WHY: un retour de lien magique Supabase ressemble à #access_token=… ; on le laisse au client Supabase.
  if (raw === '' || raw.includes('=')) return null
  if (!/^[A-Za-z0-9-]+$/.test(raw)) return null
  const normalized = normalizeAccessCode(raw)
  return isValidAccessCode(normalized) ? normalized : null
}

export async function hmacSha256Hex(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message))
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function hashAccessCode(normalized: string, pepper: string): Promise<string> {
  return hmacSha256Hex(normalized, pepper)
}

export function isBoardEmail(email: string | null | undefined): boolean {
  return typeof email === 'string' && email.toLowerCase().endsWith(`@${BOARD_EMAIL_DOMAIN}`)
}
