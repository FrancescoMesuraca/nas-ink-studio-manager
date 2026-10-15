import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { demoAccounts, errorMessage } from '../api'
import '../shared/shared.css'
import { useAuth } from './authContext'
import './login.css'

/** Accetta solo percorsi interni, per non trasformare il login in un redirect verso altri siti. */
const safeRedirect = (value: string | null) => value && value.startsWith('/') && !value.startsWith('//') ? value : '/gestionale'

export default function LoginPage() {
  const { user, loading, login } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const redirect = safeRedirect(params.get('redirect'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  if (loading) return <main className="center-page"><p role="status">Verifica della sessione…</p></main>
  if (user) return <Navigate to={redirect} replace />

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!email.trim() || !password) { setError('Inserisci email e password.'); return }
    setSending(true)
    setError('')
    try {
      await login(email, password)
      navigate(redirect, { replace: true })
    } catch (e) {
      setError(errorMessage(e, 'Accesso non riuscito.'))
      setSending(false)
    }
  }

  return <main className="center-page login-page">
    <div className="center-card login-card">
      <p className="login-brand">NAS INK</p>
      <h1>Area riservata</h1>
      <p>Accedi al gestionale dello studio.</p>
      <form className="login-form" onSubmit={submit} noValidate>
        <label>Email<input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>Password<input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {error && <p className="login-error" role="alert">{error}</p>}
        <button disabled={sending}>{sending ? 'Accesso in corso…' : 'Accedi'}</button>
      </form>
      {demoAccounts.length > 0 && <section className="login-demo" aria-label="Credenziali demo">
        <h2>Modalità demo</h2>
        <p>Nessun backend collegato. Usa uno di questi account (password <code>{demoAccounts[0].password}</code>):</p>
        <ul>{demoAccounts.map((account) => <li key={account.email}>
          <button type="button" onClick={() => { setEmail(account.email); setPassword(account.password); setError('') }}>
            <b>{account.name}</b><span>{account.role} · {account.email}</span>
          </button>
        </li>)}</ul>
      </section>}
      <Link className="login-back" to="/">← Torna al sito</Link>
    </div>
  </main>
}
