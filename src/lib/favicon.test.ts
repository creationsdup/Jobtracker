import { describe, it, expect } from 'vitest'
import { faviconProviders, resolveFaviconUrl, type FaviconProbe } from './favicon'

describe('faviconProviders', () => {
  it('returns icon.horse first with a minimum byte threshold, then google with no threshold', () => {
    const providers = faviconProviders('trenitalia.com')
    expect(providers).toEqual([
      { url: 'https://icon.horse/icon/trenitalia.com', minBytes: 1300 },
      { url: 'https://www.google.com/s2/favicons?domain=trenitalia.com&sz=128', minBytes: 0 },
    ])
  })
})

describe('resolveFaviconUrl', () => {
  it('returns the first provider when it probes ok and above its byte threshold', async () => {
    const probe: FaviconProbe = async () => ({ ok: true, size: 5000 })
    const url = await resolveFaviconUrl(faviconProviders('sncf.com'), probe)
    expect(url).toBe('https://icon.horse/icon/sncf.com')
  })

  it('skips a provider whose response is below its byte threshold (icon.horse placeholder case)', async () => {
    const probe: FaviconProbe = async (url) => {
      if (url.includes('icon.horse')) return { ok: true, size: 1027 } // icon.horse's generated placeholder for trenitalia.com
      return { ok: true, size: 368 } // google's real (if tiny) favicon
    }
    const url = await resolveFaviconUrl(faviconProviders('trenitalia.com'), probe)
    expect(url).toBe('https://www.google.com/s2/favicons?domain=trenitalia.com&sz=128')
  })

  it('skips a provider that probes not ok (network error / non-200)', async () => {
    const probe: FaviconProbe = async (url) => {
      if (url.includes('icon.horse')) return { ok: false, size: 0 }
      return { ok: true, size: 368 }
    }
    const url = await resolveFaviconUrl(faviconProviders('trenitalia.com'), probe)
    expect(url).toBe('https://www.google.com/s2/favicons?domain=trenitalia.com&sz=128')
  })

  it('skips a provider whose probe throws', async () => {
    const probe: FaviconProbe = async (url) => {
      if (url.includes('icon.horse')) throw new Error('network error')
      return { ok: true, size: 368 }
    }
    const url = await resolveFaviconUrl(faviconProviders('trenitalia.com'), probe)
    expect(url).toBe('https://www.google.com/s2/favicons?domain=trenitalia.com&sz=128')
  })

  it('returns null when every provider fails or is below threshold', async () => {
    const probe: FaviconProbe = async () => ({ ok: false, size: 0 })
    const url = await resolveFaviconUrl(faviconProviders('totallyfake.example'), probe)
    expect(url).toBeNull()
  })

  it('a real-but-small favicon still passes the second provider, which has no threshold', async () => {
    const probe: FaviconProbe = async (url) => {
      if (url.includes('icon.horse')) return { ok: false, size: 0 }
      return { ok: true, size: 50 } // tiny real favicon, e.g. a 16x16 .ico
    }
    const url = await resolveFaviconUrl(faviconProviders('small-favicon.example'), probe)
    expect(url).toBe('https://www.google.com/s2/favicons?domain=small-favicon.example&sz=128')
  })
})
