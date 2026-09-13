// Module pur : détermination de l'IP appelante à partir des en-têtes HTTP.
// Aucun import, aucune API Deno ni Node.
// WHY: un client peut fixer x-forwarded-for lui-même ; Supabase (derrière Cloudflare)
// ajoute la vraie IP en dernière position de cet en-tête et fournit aussi
// cf-connecting-ip, non falsifiable par le client, à privilégier.

function expandIPv6Groups(addr: string): string[] {
  const parts = addr.split('::')
  if (parts.length === 2) {
    const head = parts[0] === '' ? [] : parts[0].split(':')
    const tail = parts[1] === '' ? [] : parts[1].split(':')
    const missing = Math.max(0, 8 - head.length - tail.length)
    return [...head, ...Array(missing).fill('0'), ...tail]
  }
  return addr.split(':')
}

function normalizeIp(raw: string): string {
  const ip = raw.trim()
  if (!ip.includes(':')) return ip

  const lower = ip.toLowerCase()
  const v4Mapped = lower.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/)
  if (v4Mapped) return v4Mapped[1]

  const groups = expandIPv6Groups(lower)
  const firstFour = groups.slice(0, 4).map((group) => parseInt(group || '0', 16).toString(16))
  return `${firstFour.join(':')}::/64`
}

export function clientIpFromHeaders(get: (name: string) => string | null): string {
  const cfIp = (get('cf-connecting-ip') ?? '').trim()
  if (cfIp) return normalizeIp(cfIp)

  const forwardedFor = get('x-forwarded-for') ?? ''
  const entries = forwardedFor.split(',').map((entry) => entry.trim()).filter((entry) => entry !== '')
  if (entries.length > 0) return normalizeIp(entries[entries.length - 1])

  return 'unknown'
}
