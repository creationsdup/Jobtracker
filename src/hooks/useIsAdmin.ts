import { useEffect, useState } from 'react'
import { checkIsAdmin } from '@/lib/adminApi'
import { FEATURES } from '@/config/edition'

/** `null` tant que la base n’a pas répondu, pour ne pas faire clignoter le lien ni la route. */
export function useIsAdmin(): boolean | null {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(FEATURES.accessCode ? null : false)

  useEffect(() => {
    if (!FEATURES.accessCode) return
    let alive = true
    void checkIsAdmin().then((value) => { if (alive) setIsAdmin(value) })
    return () => { alive = false }
  }, [])

  return isAdmin
}
