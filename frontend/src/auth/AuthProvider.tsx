import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authApi, hasStoredSession, type User } from '../api'
import { AuthContext, type AuthState } from './authContext'

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(hasStoredSession)

  useEffect(() => {
    if (!hasStoredSession()) return
    let active = true
    authApi.me()
      .then((current) => { if (active) setUser(current) }, () => { if (active) setUser(null) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const session = await authApi.login(email, password)
    setUser(session.user)
    return session.user
  }, [])

  const logout = useCallback(async () => {
    try { await authApi.logout() } finally { setUser(null) }
  }, [])

  const value = useMemo<AuthState>(() => ({ user, loading, login, logout }), [user, loading, login, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
