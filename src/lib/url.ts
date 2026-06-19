export function extractDomain(website: string): string | null {
  const trimmed = website.trim()
  if (!trimmed) return null
  try {
    const withProtocol = trimmed.includes('://') ? trimmed : `https://${trimmed}`
    return new URL(withProtocol).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}
