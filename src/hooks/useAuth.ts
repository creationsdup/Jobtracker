import { useState, useCallback } from 'react'

const STORAGE_KEY = 'jt_user'

export function useAuth() {
  const [userName, setUserName] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY),
  )

  const login = useCallback((name: string) => {
    localStorage.setItem(STORAGE_KEY, name)
    setUserName(name)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setUserName(null)
  }, [])

  return { userName, isAuthenticated: userName !== null, login, logout }
}
