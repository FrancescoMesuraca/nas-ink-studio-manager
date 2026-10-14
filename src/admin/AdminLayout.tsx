import { useCallback, useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router'
import { errorMessage, studioApi, type StudioData } from '../api'
import { dateText } from '../shared/time'
import { emptyRequestDraft, type AdminContext, type Runner } from './adminContext'
import './admin.css'

const sections = [
  ['lettini', 'Lettini'], ['agenda', 'Agenda'], ['richieste', 'Richieste'], ['schede', 'Schede clienti'], ['configurazione', 'Configurazione'],
] as const

export default function AdminLayout() {
  const navigate = useNavigate()
  const [data, setData] = useState<StudioData | null>(null)
  const [date, setDate] = useState(dateText(new Date()))
  const [error, setError] = useState('')
  const [requestDraft, setRequestDraft] = useState(emptyRequestDraft)

  useEffect(() => {
    studioApi.getData().then(setData, (e: unknown) => setError(errorMessage(e, 'Impossibile caricare i dati dello studio.')))
  }, [])

  const run: Runner = useCallback(async (task) => {
    try { setError(''); setData(await task()); return true }
    catch (e) { setError(errorMessage(e)); return false }
  }, [])

  const context: AdminContext | null = data && {
    data, run, setError, date, setDate, requestDraft, setRequestDraft,
    openRequest: (id) => navigate('/gestionale/richieste/' + encodeURIComponent(id)),
  }

  return <main className="app">
    <header><div><p className="eyebrow">NAS INK</p><h1>Studio manager</h1></div><button className="secondary" onClick={() => void run(() => studioApi.reset())}>Ripristina dati demo</button></header>
    <nav aria-label="Sezioni">{sections.map(([path, label]) => <NavLink key={path} to={path} className={({ isActive }) => isActive ? 'active' : ''}>{label}</NavLink>)}</nav>
    {error && <p className="error" role="alert">{error}<button aria-label="Chiudi errore" onClick={() => setError('')}>×</button></p>}
    {context ? <Outlet context={context} /> : !error && <p className="empty" role="status">Caricamento…</p>}
  </main>
}
