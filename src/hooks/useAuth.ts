import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'

interface AppUser {
  authId: string
  id: string
  email: string
}

async function resolveAppUser(session: Session | null): Promise<AppUser | null> {
  if (!session?.user?.email) return null

  const { data, error } = await supabase
    .from('User')
    .select('id, email')
    .eq('email', session.user.email)
    .single()

  if (error || !data) {
    // User table lookup failed — fall back to auth identity so the app doesn't stay stuck
    console.warn('User table lookup failed, using auth identity:', error?.message)
    return { authId: session.user.id, id: session.user.id, email: session.user.email }
  }

  return { authId: session.user.id, id: data.id, email: data.email }
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return
      setSession(session)
      const user = await resolveAppUser(session)
      if (mounted) {
        setAppUser(user)
        setLoading(false)
      }
    }).catch(() => {
      if (mounted) setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return
      setSession(session)
      const user = await resolveAppUser(session)
      if (mounted) setAppUser(user)
    })

    return () => {
      mounted = false
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
    await supabase.auth.signOut()
    setAppUser(null)
  }, [])

  return {
    user: appUser,
    session,
    loading,
    isAuthenticated: !!appUser,
    signIn,
    signUp,
    signOut,
  }
}
