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

export function createShortcutCodeStore(
  readLocation: () => LocationLike,
  replaceUrl: (url: string) => void,
): { take(): string; clear(): void } {
  let cached: string | null = null
  return {
    take(): string {
      // WHY: StrictMode exécute les initialisateurs d'état deux fois en dev ; au second passage,
      // le fragment a déjà été retiré de l'adresse par le premier appel — on mémorise le résultat.
      if (cached === null) {
        cached = takeShortcutCode(readLocation(), replaceUrl)
      }
      return cached
    },
    clear(): void {
      // WHY: une fois le code consommé (ouverture réussie), il ne doit plus jamais être réutilisé
      // — notamment si l'app est remontée après une déconnexion (« Quitter ce tableau »).
      cached = ''
    },
  }
}

// WHY: guard `typeof window` pour rester importable depuis Vitest (environnement node) sans jsdom.
const browserStore = typeof window === 'undefined'
  ? null
  : createShortcutCodeStore(() => window.location, (url) => window.history.replaceState(null, '', url))

export function takeShortcutCodeOnce(): string {
  return browserStore ? browserStore.take() : ''
}

export function clearShortcutCode(): void {
  browserStore?.clear()
}
