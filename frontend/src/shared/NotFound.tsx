import { Link } from 'react-router'
import './shared.css'

export default function NotFound() {
  return <main className="center-page">
    <div className="center-card">
      <p className="center-code">404</p>
      <h1>Pagina non trovata</h1>
      <p>L’indirizzo che hai aperto non esiste o è stato spostato.</p>
      <Link className="center-link" to="/">Torna alla home</Link>
    </div>
  </main>
}
