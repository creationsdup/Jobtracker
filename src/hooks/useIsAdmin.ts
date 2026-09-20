import { useEffect, useState } from 'react'
import { checkIsAdmin } from '@/lib/adminApi'
import { FEATURES } from '@/config/edition'

/**
 * `null` tant que la base n’a pas répondu (ou tant qu’on n’est pas authentifié), pour ne pas
 * faire clignoter le lien ni la route.
 *
 * WHY: le test doit dépendre de l’authentification. `is_admin()` appelé avant toute session
 * échoue avec la clé anon (42501) et résolvait autrefois `false` — mis en cache pour la vie de
 * la page, y compris après connexion, faute de rejouer l’effet. En le faisant dépendre de
 * `isAuthenticated`, l’effet rejoue dès que la session apparaît (ou disparaît).
 */
export function useIsAdmin(isAuthenticated: boolean): boolean | null {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(FEATURES.accessCode ? null : false)

  useEffect(() => {
    if (!FEATURES.accessCode || !isAuthenticated) {
      setIsAdmin(FEATURES.accessCode ? null : false)
      return
    }
    let alive = true
    void checkIsAdmin().then((value) => { if (alive) setIsAdmin(value) })
    return () => { alive = false }
  }, [isAuthenticated])

  return isAdmin
}
