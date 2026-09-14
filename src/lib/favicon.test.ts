import { describe, it, expect } from 'vitest'
import { faviconProviders, isIconHorsePlaceholder, resolveFaviconUrl, type FaviconProbes } from './favicon'

// Cache-Control observed on 2026-09-14: icon.horse's generated letter avatar vs a real icon.
const PLACEHOLDER_CACHE = 'public, max-age=604800, s-maxage=300, stale-while-revalidate=3600'
const REAL_ICON_CACHE = 'public, max-age=604800, s-maxage=2592000, stale-while-revalidate=604800'

function probes(overrides: Partial<FaviconProbes> = {}): FaviconProbes {
  return {
    fetch: async () => ({ ok: true, cacheControl: REAL_ICON_CACHE }),
    image: async () => ({ loaded: true, width: 48 }),
    ...overrides,
  }
}

describe('faviconProviders', () => {
  it('returns icon.horse first, then google', () => {
    expect(faviconProviders('trenitalia.com')).toEqual([
      { kind: 'iconHorse', url: 'https://icon.horse/icon/trenitalia.com' },
      { kind: 'google', url: 'https://www.google.com/s2/favicons?domain=trenitalia.com&sz=128' },
    ])
  })
})

describe('isIconHorsePlaceholder', () => {
  it('recognises the generated letter avatar by its 5-minute CDN cache', () => {
    expect(isIconHorsePlaceholder(PLACEHOLDER_CACHE)).toBe(true)
    expect(isIconHorsePlaceholder('s-maxage=300')).toBe(true)
  })

  it('does not flag real icons or other cache headers', () => {
    expect(isIconHorsePlaceholder(REAL_ICON_CACHE)).toBe(false)
    expect(isIconHorsePlaceholder('public, s-maxage=3000')).toBe(false)
    expect(isIconHorsePlaceholder(null)).toBe(false)
  })
})

describe('resolveFaviconUrl', () => {
  it('returns icon.horse when it serves a real icon, without loading google', async () => {
    let googleLoaded = false
    const url = await resolveFaviconUrl(faviconProviders('qonto.com'), probes({
      image: async () => { googleLoaded = true; return { loaded: true, width: 48 } },
    }))
    expect(url).toBe('https://icon.horse/icon/qonto.com')
    expect(googleLoaded).toBe(false)
  })

  it('falls back to google when icon.horse serves its placeholder, whatever its size (sncf.com case)', async () => {
    const url = await resolveFaviconUrl(faviconProviders('sncf.com'), probes({
      fetch: async () => ({ ok: true, cacheControl: PLACEHOLDER_CACHE }),
    }))
    expect(url).toBe('https://www.google.com/s2/favicons?domain=sncf.com&sz=128')
  })

  it('falls back to google when icon.horse answers not ok or its probe throws', async () => {
    const notOk = await resolveFaviconUrl(faviconProviders('a.example'), probes({
      fetch: async () => ({ ok: false, cacheControl: null }),
    }))
    const throws = await resolveFaviconUrl(faviconProviders('b.example'), probes({
      fetch: async () => { throw new TypeError('Failed to fetch') },
    }))
    expect(notOk).toBe('https://www.google.com/s2/favicons?domain=a.example&sz=128')
    expect(throws).toBe('https://www.google.com/s2/favicons?domain=b.example&sz=128')
  })

  it('rejects google’s 16×16 default globe, served when it has no icon', async () => {
    const url = await resolveFaviconUrl(faviconProviders('unknown.example'), probes({
      fetch: async () => ({ ok: true, cacheControl: PLACEHOLDER_CACHE }),
      image: async () => ({ loaded: true, width: 16 }),
    }))
    expect(url).toBeNull()
  })

  it('returns null when google fails to load as well', async () => {
    const url = await resolveFaviconUrl(faviconProviders('offline.example'), probes({
      fetch: async () => { throw new TypeError('Failed to fetch') },
      image: async () => ({ loaded: false, width: 0 }),
    }))
    expect(url).toBeNull()
  })
})
