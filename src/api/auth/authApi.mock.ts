// Login finto con gli utenti demo di seed/users.json. Le password in chiaro esistono solo qui.
import users from '../mock/seed/users.json'
import { simulate, uid } from '../mock/storage'
import { tokenStore } from '../session'
import { ApiError, type Role, type User } from '../types'
import type { AuthApi } from './authApi'

type MockUser = User & { password: string }

const accounts = users as MockUser[]
const publicUser = ({ id, name, email, role, artistId }: MockUser): User => ({ id, name, email, role, ...(artistId ? { artistId } : {}) })

/** Utente collegato al token corrente (usato anche dagli altri mock per i controlli di ruolo). */
export function mockCurrentUser(): User | null {
  const userId = tokenStore.get()?.split('.')[1]
  const account = accounts.find((item) => item.id === userId)
  return account ? publicUser(account) : null
}

export function requireMockRole(role: Role) {
  const user = mockCurrentUser()
  if (!user) throw new ApiError(401, 'Sessione scaduta: accedi di nuovo.')
  if (user.role !== role) throw new ApiError(403, 'Non hai i permessi per questa operazione.')
  return user
}

/** Credenziali da mostrare nella pagina di login in modalità demo. */
export const demoAccounts = accounts.map(({ email, password, name, role }) => ({ email, password, name, role }))

export const authApiMock: AuthApi = {
  login: (email, password) => simulate(() => {
    if (!email.trim() || !password) throw new ApiError(400, 'Inserisci email e password.')
    const account = accounts.find((item) => item.email.toLowerCase() === email.trim().toLowerCase())
    if (!account || account.password !== password) throw new ApiError(401, 'Email o password non corretti.')
    const token = 'mock.' + account.id + '.' + uid()
    tokenStore.set(token)
    return { token, user: publicUser(account) }
  }),
  logout: () => simulate(() => tokenStore.set(null)),
  me: () => simulate(() => {
    const user = mockCurrentUser()
    if (!user) {
      tokenStore.set(null)
      throw new ApiError(401, 'Sessione scaduta: accedi di nuovo.')
    }
    return user
  }),
}
