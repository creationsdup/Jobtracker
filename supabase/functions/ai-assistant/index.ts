import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders(),
    })
  }

  try {
    const apiKey = Deno.env.get('OPENAI_API_KEY')
    if (!apiKey) {
      return json({ error: 'Missing OPENAI_API_KEY' }, 500)
    }

    const body = await req.json()
    const { systemPrompt, userContent, maxTokens, json: wantsJson, url } = body

    if (typeof systemPrompt !== 'string' || !systemPrompt.trim() || systemPrompt.length > 8000) {
      return json({ error: 'Invalid systemPrompt' }, 400)
    }
    if (userContent !== undefined && (typeof userContent !== 'string' || userContent.length > 20000)) {
      return json({ error: 'Invalid userContent' }, 400)
    }
    if (url !== undefined && typeof url !== 'string') {
      return json({ error: 'Invalid url' }, 400)
    }
    if (maxTokens !== undefined && (typeof maxTokens !== 'number' || !Number.isFinite(maxTokens))) {
      return json({ error: 'Invalid maxTokens' }, 400)
    }
    const clampedMaxTokens = Math.min(Math.max(Math.trunc(maxTokens ?? 1400), 1), 2000)

    if (url) {
      const safe = await isSafeUrl(url)
      if (!safe) {
        return json({ error: 'URL not allowed' }, 400)
      }
    }

    const scraped = url ? await scrapePage(url) : null
    const finalUserContent = scraped?.text ?? userContent

    const openAiRes = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        ...(wantsJson ? { response_format: { type: 'json_object' } } : {}),
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: finalUserContent },
        ],
        max_tokens: clampedMaxTokens,
      }),
    })

    const body = await openAiRes.json()
    if (!openAiRes.ok) {
      const message = body?.error?.message ?? 'OpenAI request failed'
      return json({ error: message }, openAiRes.status)
    }

    const content = body?.choices?.[0]?.message?.content
    if (typeof content !== 'string' || !content.trim()) {
      return json({ error: 'Empty AI response' }, 502)
    }

    if (wantsJson) {
      return json(JSON.parse(content), 200)
    }

    return json({ text: content.trim() }, 200)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected edge error'
    return json({ error: message }, 500)
  }
})

const IGNORED_LINK_DOMAINS = [
  'linkedin.com', 'indeed.com', 'glassdoor.com', 'welcometothejungle.com',
  'facebook.com', 'twitter.com', 'x.com', 'instagram.com', 'youtube.com',
  'google.com', 'apple.com', 'play.google.com', 'tiktok.com', 'pinterest.com',
  'schema.org', 'w3.org', 'cloudflare.com', 'fonts.googleapis.com', 'gstatic.com',
  'doubleclick.net', 'googletagmanager.com', 'google-analytics.com',
]

// Empêche le SSRF : seuls http(s) vers un hôte public sont autorisés (pas de loopback,
// pas de plages privées/link-local, ni pour le hostname littéral ni pour son IP résolue).
async function isSafeUrl(rawUrl: string): Promise<boolean> {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    return false
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false

  const hostname = parsed.hostname.toLowerCase()
  if (hostname === 'localhost' || hostname.endsWith('.local')) return false

  const ipsToCheck: string[] = []
  if (isIpLiteral(hostname)) {
    ipsToCheck.push(hostname)
  } else {
    try {
      const records = await Promise.all([
        Deno.resolveDns(hostname, 'A').catch(() => []),
        Deno.resolveDns(hostname, 'AAAA').catch(() => []),
      ])
      ipsToCheck.push(...records.flat())
    } catch {
      return false
    }
  }

  if (ipsToCheck.length === 0) return false
  return ipsToCheck.every((ip) => !isPrivateOrReservedIp(ip))
}

function isIpLiteral(host: string): boolean {
  return /^[0-9.]+$/.test(host) || host.includes(':')
}

function isPrivateOrReservedIp(ip: string): boolean {
  if (ip.includes(':')) {
    const lower = ip.toLowerCase()
    return (
      lower === '::1' ||
      lower.startsWith('fe80:') ||
      lower.startsWith('fc') ||
      lower.startsWith('fd') ||
      lower.startsWith('::ffff:127.') ||
      lower === '::'
    )
  }

  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true

  const [a, b] = parts
  if (a === 127) return true // loopback
  if (a === 10) return true // 10.0.0.0/8
  if (a === 172 && b >= 16 && b <= 31) return true // 172.16.0.0/12
  if (a === 192 && b === 168) return true // 192.168.0.0/16
  if (a === 169 && b === 254) return true // link-local / cloud metadata
  if (a === 0) return true // 0.0.0.0/8
  if (a === 100 && b >= 64 && b <= 127) return true // 100.64.0.0/10 (shared/CGNAT)
  return false
}

// Scraping s'exécute côté Deno (pas de CORS) ; renvoie null si la page n'est pas accessible
// pour laisser l'appelant retomber sur le prompt "infère depuis l'URL".
async function scrapePage(url: string): Promise<{ text: string; candidateDomains: string[] } | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JobTrackerBot/1.0)' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null

    const html = await res.text()
    const pageHostname = new URL(url).hostname.replace(/^www\./, '')
    const candidateDomains = extractCandidateDomains(html, pageHostname)
    const text = stripHtml(html)
    if (text.length <= 200) return null

    const withDomains = candidateDomains.length
      ? `${text.slice(0, 11500)}\n\nDomaines liés trouvés sur la page (un seul est probablement le site officiel de l'entreprise, les autres sont des réseaux sociaux ou outils tiers) : ${candidateDomains.join(', ')}`
      : text.slice(0, 12000)

    return { text: withDomains, candidateDomains }
  } catch {
    return null
  }
}

function extractCandidateDomains(html: string, pageHostname: string): string[] {
  const hrefs = html.matchAll(/href=["']([^"']+)["']/gi)
  const domains = new Set<string>()

  for (const [, href] of hrefs) {
    try {
      const hostname = new URL(href, `https://${pageHostname}`).hostname.replace(/^www\./, '')
      if (hostname === pageHostname) continue
      if (IGNORED_LINK_DOMAINS.some((d) => hostname === d || hostname.endsWith(`.${d}`))) continue
      domains.add(hostname)
    } catch {
      // ignore malformed hrefs
    }
  }

  return [...domains].slice(0, 8)
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  }
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: corsHeaders(),
  })
}
