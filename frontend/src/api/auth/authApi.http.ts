// Stub HTTP dell'autenticazione.
//
//   POST /auth/login   { email, password } → Session { token, user }   401 se le credenziali sono errate
//   POST /auth/logout                                                   invalida il token (204)
//   GET  /auth/me      → User                                           401 se il token non è valido
//
// Il token viene inviato come `Authorization: Bearer <token>` da client.ts.
import { http } from '../client'
import { tokenStore } from '../session'
import type { Session, User } from '../types'
import type { AuthApi } from './authApi'

export const authApiHttp: AuthApi = {
  async login(email, password) {
    const session = await http<Session>('POST', '/auth/login', { email, password })
    tokenStore.set(session.token)
    return session
  },
  async logout() {
    try { await http<void>('POST', '/auth/logout') } finally { tokenStore.set(null) }
  },
  me: () => http<User>('GET', '/auth/me'),
}
