import { useEffect, useState } from 'react'
import { getInitial } from '@/lib/utils'
import { extractDomain } from '@/lib/url'

interface CompanyLogoProps {
  company: string
  logoUrl?: string | null
  size: number
  className?: string
  fallbackBg?: string
  fallbackFg?: string
}

function faviconProviders(domain: string): string[] {
  return [
    `https://icon.horse/icon/${domain}`,
    `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
  ]
}

// Affiche le favicon du site web réel de l'entreprise (saisi par l'utilisateur, stocké dans
// OrgLogo) — pas de devinette de domaine, qui produisait des logos erronés. Essaie plusieurs
// fournisseurs de favicon avant de retomber sur l'avatar à initiale si aucun ne répond.
export function CompanyLogo({
  company,
  logoUrl,
  size,
  className,
  fallbackBg = 'var(--color-deep-space-light)',
  fallbackFg = 'var(--color-deep-space)',
}: CompanyLogoProps) {
  const domain = logoUrl ? extractDomain(logoUrl) : null
  const providers = domain ? faviconProviders(domain) : []
  const [providerIndex, setProviderIndex] = useState(0)

  useEffect(() => { setProviderIndex(0) }, [domain])

  if (!domain || providerIndex >= providers.length) {
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
      key={`${domain}-${providerIndex}`}
      src={providers[providerIndex]}
      alt=""
      width={size}
      height={size}
      className={`rounded-[10px] object-contain bg-white flex-shrink-0 ${className ?? ''}`}
      style={{ width: size, height: size }}
      onError={() => setProviderIndex((i) => i + 1)}
    />
  )
}
