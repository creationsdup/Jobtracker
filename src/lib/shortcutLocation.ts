// Extraction du raccourci de code d'accès depuis l'adresse (fragment #CODE), et nettoyage de l'URL.
import { parseShortcutHash } from './accessCode'

export interface LocationLike {
  hash: string
  pathname: string
  search: string
}

export function takeShortcutCode(location: LocationLike, replaceUrl: (url: string) => void): string {
  const code = parseShortcutHash(location.hash)
  if (!code) return ''
  // WHY: le code ne doit pas rester dans l'adresse (historique, partage d'écran).
  replaceUrl(location.pathname + location.search)
  return code
}

let cached: string | null = null

export function takeShortcutCodeOnce(): string {
  // WHY: StrictMode exécute les initialisateurs d'état deux fois en dev ; au second passage,
  // le fragment a déjà été retiré de l'adresse par le premier appel — on mémorise le résultat.
  if (cached === null) {
    cached = takeShortcutCode(window.location, (url) => window.history.replaceState(null, '', url))
  }
  return cached
}
