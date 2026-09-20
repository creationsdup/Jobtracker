import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { resetAdminCheck } from '@/lib/adminApi'

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
  // WHY: comparé hors de tout updater d'état pour ne pas placer un effet de bord (reset d'un
  // cache module) dans une fonction que React 18 StrictMode peut invoquer deux fois.
  const previousUserIdRef = useRef<string | null>(null)

  useEffect(() => {
    // onAuthStateChange fires INITIAL_SESSION on mount with the cached session
    // (reads localStorage, no network). Single listener = no race condition.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED') return

      if (event === 'PASSWORD_RECOVERY') setIsPasswordRecovery(true)

      // WHY: le cache de is_admin() vit au niveau du module et survivrait à un changement de
      // tableau dans le même onglet — l'application n'est jamais rechargée entre les deux.
      // Sans cette invalidation, le lien et la route d'administration mentiraient sur l'identité.
      const nextUserId = session?.user.id ?? null
      if (previousUserIdRef.current !== nextUserId) resetAdminCheck()
      previousUserIdRef.current = nextUserId

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

  const signUp = useCallback(async (
    email: string,
    password: string,
    profileFields: { firstName: string; lastName: string; birthDate: string | null },
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: profileFields },
    })
    // When email confirmation is required, Supabase returns a user but no
    // session and no error — without this flag the signup form looks broken.
    const needsConfirmation = !error && !data.session
    return { error, needsConfirmation }
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
