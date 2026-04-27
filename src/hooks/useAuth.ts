import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'

interface AppUser {
  id: string
  email: string
}

async function resolveUserId(session: Session): Promise<AppUser> {
  const fallback: AppUser = { id: session.user.id, email: session.user.email ?? '' }

  try {
    let settled = false
    const dbLookup = supabase
      .from('User')
      .select('id, email')
      .eq('email', session.user.email)
      .single()
      .then(({ data, error }) => {
        settled = true
        if (error || !data) return fallback
        return { id: (data as { id: string; email: string }).id, email: (data as { id: string; email: string }).email }
      })

    const timeout = new Promise<AppUser>((resolve) =>
      setTimeout(() => { if (!settled) resolve(fallback) }, 4000)
    )

    return await Promise.race([dbLookup, timeout])
  } catch {
    return fallback
  }
}

export function useAuth() {
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const safetyTimeout = setTimeout(() => {
      if (mounted) setLoading(false)
    }, 6000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      if (event === 'SIGNED_OUT') {
        setAppUser(null)
        return
      }

      if (session) {
        const user = await resolveUserId(session)
        if (mounted) setAppUser(user)
      } else {
        if (mounted) setAppUser(null)
      }

      if (event === 'INITIAL_SESSION' && mounted) {
        setLoading(false)
        clearTimeout(safetyTimeout)
      }
    })

    return () => {
      mounted = false
      clearTimeout(safetyTimeout)
      subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error
  }, [])

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    return error
  }, [])

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut()
    } catch {
      setAppUser(null)
    }
  }, [])

  return {
    user: appUser,
    loading,
    isAuthenticated: !!appUser,
    signIn,
    signUp,
    signOut,
  }
}
