// Pure scoring logic for matching a job offer against a user's search
// objective. No React, no Supabase — testable as plain functions.

export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Word-boundary phrase match — avoids "industrie" falsely matching inside "industriels". */
export function containsPhrase(haystack: string, phrase: string): boolean {
  const h = normalizeText(haystack)
  const p = normalizeText(phrase)
  if (!p) return false
  return new RegExp(`\\b${escapeRegExp(p)}\\b`).test(h)
}

/** Bidirectional substring match after normalization — for short/specific tokens (contract types, city names). */
export function eitherContains(a: string, b: string): boolean {
  const na = normalizeText(a)
  const nb = normalizeText(b)
  if (!na || !nb) return false
  return na.includes(nb) || nb.includes(na)
}
