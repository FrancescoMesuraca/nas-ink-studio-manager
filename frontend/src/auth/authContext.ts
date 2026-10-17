import { createContext, useContext } from 'react'
import type { User } from '../api'

export type AuthState = {
  /** `null` se non autenticato. */
  user: User | null
  /** true finché la sessione salvata non è stata verificata. */
  loading: boolean
  login: (email: string, password: string) => Promise<User>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth() {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error('useAuth deve essere usato dentro AuthProvider.')
  return auth
}
