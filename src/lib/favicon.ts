export interface FaviconProvider {
  kind: 'iconHorse' | 'google'
  url: string
}

export function faviconProviders(domain: string): FaviconProvider[] {
  return [
    { kind: 'iconHorse', url: `https://icon.horse/icon/${domain}` },
    { kind: 'google', url: `https://www.google.com/s2/favicons?domain=${domain}&sz=128` },
  ]
}

export interface FaviconProbes {
  // icon.horse sends CORS headers, so its response status and headers can be read.
  fetch: (url: string) => Promise<{ ok: boolean; cacheControl: string | null }>
  // Google sends no CORS header (fetch always fails in the browser): load it as an image instead.
  image: (url: string) => Promise<{ loaded: boolean; width: number }>
}

// icon.horse answers HTTP 200 with a generated grey letter avatar when it has no real favicon. Its size
// varies with the letter (1027 B for "T", 4267 B for "S", observed 2026-09-14), so a byte threshold
// cannot catch it — but it is cached on the CDN for 5 minutes (`s-maxage=300`) vs 30 days for real icons.
export function isIconHorsePlaceholder(cacheControl: string | null): boolean {
  return /(?:^|[\s,])s-maxage=300(?:$|[\s,])/.test(cacheControl ?? '')
}

// WHY: with no icon, Google serves its default 16×16 globe (status 404, yet the image loads). A real
// 16px favicon blown up in the avatar would not look better than the initial either.
const GOOGLE_DEFAULT_ICON_WIDTH = 16

export async function resolveFaviconUrl(providers: FaviconProvider[], probes: FaviconProbes): Promise<string | null> {
  for (const provider of providers) {
    try {
      if (provider.kind === 'iconHorse') {
        const { ok, cacheControl } = await probes.fetch(provider.url)
        if (ok && !isIconHorsePlaceholder(cacheControl)) return provider.url
      } else {
        const { loaded, width } = await probes.image(provider.url)
        if (loaded && width > GOOGLE_DEFAULT_ICON_WIDTH) return provider.url
      }
    } catch {
      // try the next provider
    }
  }
  return null
}
