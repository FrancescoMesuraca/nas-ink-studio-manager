import type { ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import type { Role } from '../api'
import '../shared/shared.css'
import { useAuth } from './authContext'

/** Pagine riservate: senza sessione rimanda a /login?redirect=<pagina richiesta>. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <main className="center-page"><p role="status">Verifica della sessione…</p></main>
  if (!user) return <Navigate to={'/login?redirect=' + encodeURIComponent(location.pathname + location.search)} replace />
  return children
}

/** Pagine riservate a uno o più ruoli. Va usata dentro RequireAuth. */
export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user } = useAuth()
  if (user && roles.includes(user.role)) return children
  return <div className="center-page forbidden" role="alert">
    <div className="center-card">
      <p className="center-code">403</p>
      <h1>Accesso non consentito</h1>
      <p>Questa sezione è riservata al titolare dello studio.</p>
      <Link className="center-link" to="/gestionale">Torna al gestionale</Link>
    </div>
  </div>
}
