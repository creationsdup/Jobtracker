import { useEffect, useState } from 'react'
import { getInitial } from '@/lib/utils'
import { extractDomain } from '@/lib/url'
import { faviconProviders, resolveFaviconUrl, type FaviconProbes } from '@/lib/favicon'

interface CompanyLogoProps {
  company: string
  logoUrl?: string | null
  size: number
  className?: string
  fallbackBg?: string
  fallbackFg?: string
}

// WHY: icon.horse renvoie un HTTP 200 avec une image valide même sans vrai favicon (avatar-lettre
// généré), donc onError seul ne le détecte pas : on lit son en-tête de cache (voir lib/favicon).
// Google n'a pas d'en-tête CORS : chargé comme image, on juge sur sa largeur réelle.
const FAVICON_PROBES: FaviconProbes = {
  fetch: async (url) => {
    const res = await fetch(url)
    return { ok: res.ok, cacheControl: res.headers.get('cache-control') }
  },
  image: (url) => new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve({ loaded: true, width: img.naturalWidth })
    img.onerror = () => resolve({ loaded: false, width: 0 })
    img.src = url
  }),
}

// Affiche le favicon du site de l'entreprise (saisi et stocké dans OrgLogo, trouvé dans le catalogue
// partagé ou via Clearbit — voir lib/companyLookup, qui exige un nom identique pour éviter les faux
// logos). Essaie plusieurs fournisseurs de favicon avant de retomber sur l'avatar à initiale.
export function CompanyLogo({
  company,
  logoUrl,
  size,
  className,
  fallbackBg = 'var(--color-deep-space-light)',
  fallbackFg = 'var(--color-deep-space)',
}: CompanyLogoProps) {
  const domain = logoUrl ? extractDomain(logoUrl) : null
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null)
  const [imgFailed, setImgFailed] = useState(false)

  useEffect(() => {
    setResolvedUrl(null)
    setImgFailed(false)
    if (!domain) return

    let cancelled = false
    resolveFaviconUrl(faviconProviders(domain), FAVICON_PROBES).then((url) => {
      if (!cancelled) setResolvedUrl(url)
    })
    return () => { cancelled = true }
  }, [domain])

  if (!resolvedUrl || imgFailed) {
    return (
      <div
        className={`flex items-center justify-center font-bold rounded-[10px] flex-shrink-0 ${className ?? ''}`}
        style={{
          width: size,
          height: size,
          background: fallbackBg,
          color: fallbackFg,
          fontSize: size * 0.4,
        }}
      >
        {getInitial(company)}
      </div>
    )
  }

  return (
    <img
      key={resolvedUrl}
      src={resolvedUrl}
      alt=""
      width={size}
      height={size}
      className={`rounded-[10px] object-contain bg-white flex-shrink-0 ${className ?? ''}`}
      style={{ width: size, height: size }}
      onError={() => setImgFailed(true)}
    />
  )
}
