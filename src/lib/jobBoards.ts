const JOB_BOARD_DOMAINS = [
  'linkedin.com',
  'indeed.com',
  'indeed.fr',
  'indeed.co.uk',
  'glassdoor.com',
  'glassdoor.fr',
  'welcometothejungle.com',
  'monster.com',
  'monster.fr',
  'apec.fr',
  'pole-emploi.fr',
  'francetravail.fr',
  'hellowork.com',
  'jobteaser.com',
  'cadremploi.fr',
  'regionsjob.com',
  'meteojob.com',
  'greenhouse.io',
  'lever.co',
  'workday.com',
  'smartrecruiters.com',
]

// Devine le site web de l'entreprise depuis l'URL de l'offre : si l'offre n'est pas hébergée
// sur un jobboard connu, son domaine est probablement déjà celui du site de l'entreprise
// (page carrière directe). Retourne null pour les jobboards (pas de devinette fiable possible).
export function guessCompanyWebsiteFromJobUrl(jobUrl: string): string | null {
  const trimmed = jobUrl.trim()
  if (!trimmed) return null
  try {
    const url = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`)
    const hostname = url.hostname.replace(/^www\./, '')
    const isJobBoard = JOB_BOARD_DOMAINS.some((d) => hostname === d || hostname.endsWith(`.${d}`))
    if (isJobBoard) return null
    return `${url.protocol}//${hostname}`
  } catch {
    return null
  }
}
