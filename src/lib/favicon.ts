export interface FaviconProvider {
  url: string
  // icon.horse returns HTTP 200 with a valid-but-fake generated letter-avatar PNG
  // (not an error) for domains it can't crawl, instead of failing — observed at ~1KB
  // vs 1.5KB+ for the real icons it serves when it actually has one. Anything below
  // this threshold is treated as that placeholder, not a real logo.
  minBytes: number
}

export function faviconProviders(domain: string): FaviconProvider[] {
  return [
    { url: `https://icon.horse/icon/${domain}`, minBytes: 1300 },
    { url: `https://www.google.com/s2/favicons?domain=${domain}&sz=128`, minBytes: 0 },
  ]
}

export type FaviconProbe = (url: string) => Promise<{ ok: boolean; size: number }>

export async function resolveFaviconUrl(providers: FaviconProvider[], probe: FaviconProbe): Promise<string | null> {
  for (const provider of providers) {
    try {
      const { ok, size } = await probe(provider.url)
      if (ok && size >= provider.minBytes) return provider.url
    } catch {
      // try the next provider
    }
  }
  return null
}
