import { useEffect, useState } from 'react'
import { getInitial } from '@/lib/utils'
import { extractDomain } from '@/lib/url'
import { faviconProviders, resolveFaviconUrl, type FaviconProbe } from '@/lib/favicon'

interface CompanyLogoProps {
  company: string
  logoUrl?: string | null
  size: number
  className?: string
  fallbackBg?: string
  fallbackFg?: string
}

// Vérifie la taille réelle de la réponse avant de l'accepter — icon.horse renvoie un
// HTTP 200 avec une image valide même quand il n'a pas le vrai favicon (un avatar-lettre
// généré, ~1Ko), donc onError seul ne suffit pas à le détecter.
const probeFavicon: FaviconProbe = async (url) => {
  const res = await fetch(url)
  if (!res.ok) return { ok: false, size: 0 }
  const blob = await res.blob()
  return { ok: true, size: blob.size }
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
    resolveFaviconUrl(faviconProviders(domain), probeFavicon).then((url) => {
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
