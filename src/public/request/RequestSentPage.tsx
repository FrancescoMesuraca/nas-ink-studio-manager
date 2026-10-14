import { useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router'
import { usePublicSite } from '../publicContext'
import './request.css'

export default function RequestSentPage() {
  const { content } = usePublicSite()
  const name = (useLocation().state as { name?: string } | null)?.name
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { heading.current?.focus() }, [])
  return <section className="site-section site-page">
    <div className="site-container site-narrow request-sent">
      <span className="request-sent-icon" aria-hidden="true">✓</span>
      <h1 ref={heading} tabIndex={-1}>{name ? 'Grazie, ' + name + '!' : 'Richiesta inviata'}</h1>
      <p>Abbiamo ricevuto la tua richiesta. La leggiamo con calma e ti ricontattiamo nei prossimi giorni per fissare una consulenza in studio.</p>
      <p className="request-sent-small">Se hai bisogno di aggiungere qualcosa scrivici{content.contacts.email && <> a <a href={'mailto:' + content.contacts.email}>{content.contacts.email}</a></>}{content.contacts.phone && <> o chiama il <a href={'tel:' + content.contacts.phone.replace(/\s+/g, '')}>{content.contacts.phone}</a></>}.</p>
      <Link className="site-button site-button-large" to="/">Torna alla home</Link>
    </div>
  </section>
}
