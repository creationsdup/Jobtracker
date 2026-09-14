import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface BoardUserState {
  userId: string | null
  email: string | null
  pendingEmail: string | null
  loading: boolean
}

export function useBoardUser() {
  const [state, setState] = useState<BoardUserState>({ userId: null, email: null, pendingEmail: null, loading: true })

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getUser()
    setState({
      userId: data.user?.id ?? null,
      email: data.user?.email ?? null,
      pendingEmail: data.user?.new_email ?? null,
      loading: false,
    })
  }, [])

  useEffect(() => {
    void refresh()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      // WHY: ne pas appeler Supabase directement dans ce callback (risque de blocage documenté par supabase-js).
      if (event === 'USER_UPDATED') window.setTimeout(() => void refresh(), 0)
    })
    return () => subscription.unsubscribe()
  }, [refresh])

  return { ...state, refresh }
}
