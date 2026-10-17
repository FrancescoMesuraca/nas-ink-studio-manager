import { useCallback, useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router'
import { errorMessage, isMockMode, studioApi, type Role, type StudioData } from '../api'
import { useAuth } from '../auth/authContext'
import { dateText } from '../shared/time'
import { emptyRequestDraft, type AdminContext, type Runner } from './adminContext'
import './admin.css'

const everyone: Role[] = ['titolare', 'tatuatore']
const sections: { path: string; label: string; roles: Role[] }[] = [
  { path: 'lettini', label: 'Lettini', roles: everyone },
  { path: 'agenda', label: 'Agenda', roles: everyone },
  { path: 'richieste', label: 'Richieste', roles: everyone },
  { path: 'schede', label: 'Schede clienti', roles: everyone },
  { path: 'configurazione', label: 'Configurazione', roles: ['titolare'] },
  { path: 'sito', label: 'Sito vetrina', roles: ['titolare'] },
]
const roleLabel: Record<Role, string> = { titolare: 'Titolare', tatuatore: 'Tatuatore' }

export default function AdminLayout() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
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
    <header><div><p className="eyebrow">NAS INK</p><h1>Studio manager</h1></div>
      <div className="user-bar">
        {user && <span className="user-name"><b>{user.name}</b><small>{roleLabel[user.role]}</small></span>}
        {isMockMode && user?.role === 'titolare' && <button className="secondary" onClick={() => void run(() => studioApi.reset())}>Ripristina dati demo</button>}
        <button className="secondary" onClick={() => void logout().then(() => navigate('/login', { replace: true }))}>Esci</button>
      </div>
    </header>
    <nav aria-label="Sezioni">{sections.filter((section) => user && section.roles.includes(user.role)).map((section) => <NavLink key={section.path} to={section.path} className={({ isActive }) => isActive ? 'active' : ''}>{section.label}</NavLink>)}</nav>
    {error && <p className="error" role="alert">{error}<button aria-label="Chiudi errore" onClick={() => setError('')}>×</button></p>}
    {context ? <Outlet context={context} /> : !error && <p className="empty" role="status">Caricamento…</p>}
  </main>
}
