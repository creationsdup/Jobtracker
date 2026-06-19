import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface AppUser {
  id: string
  email: string
}

export function useAuth() {
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  // PASSWORD_RECOVERY fires with a valid session — without this flag the user
  // would land straight in the app instead of the "choose a new password" screen.
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false)

  useEffect(() => {
    // onAuthStateChange fires INITIAL_SESSION on mount with the cached session
    // (reads localStorage, no network). Single listener = no race condition.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED') return

      if (event === 'PASSWORD_RECOVERY') setIsPasswordRecovery(true)

      if (session) {
        setAppUser({ id: session.user.id, email: session.user.email ?? '' })
      } else {
        setAppUser(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error
  }, [])

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    return error
  }, [])

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    return error
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const sendPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return error
  }, [])

  const completePasswordRecovery = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password })
    if (!error) setIsPasswordRecovery(false)
    return error
  }, [])

  return {
    user: appUser,
    loading,
    isAuthenticated: !!appUser,
    isPasswordRecovery,
    signIn,
    signInWithGoogle,
    signUp,
    signOut,
    sendPasswordReset,
    completePasswordRecovery,
  }
}
