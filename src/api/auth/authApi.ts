import type { Session, User } from '../types'

/**
 * Autenticazione di titolare e dipendenti. Il token della sessione è gestito dal livello API
 * (`tokenStore`): `login` lo salva, `logout` lo cancella, `me` lo usa per ripristinare la sessione.
 */
export interface AuthApi {
  /** 400 se mancano i dati, 401 se le credenziali non sono corrette. */
  login(email: string, password: string): Promise<Session>
  logout(): Promise<void>
  /** Utente della sessione salvata; 401 se non c'è o è scaduta. */
  me(): Promise<User>
}
