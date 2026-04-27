import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'

interface AppUser {
  authId: string   // Supabase Auth UUID
  id: string       // CUID dans la table User
  email: string
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  async function resolveAppUser(session: Session | null) {
    if (!session?.user?.email) {
      setAppUser(null)
      return
    }
    const { data } = await supabase
      .from('User')
      .select('id, email')
      .eq('email', session.user.email)
      .single()

    if (data) {
      setAppUser({ authId: session.user.id, id: data.id, email: data.email })
    } else {
      setAppUser(null)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      await resolveAppUser(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      await resolveAppUser(session)
    })

    return () => subscription.unsubscribe()
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
