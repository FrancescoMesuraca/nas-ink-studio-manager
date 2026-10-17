import { useCallback, useEffect, useState } from 'react'
import { Outlet } from 'react-router'
import { errorMessage, siteApi, type PublicSite } from '../api'
import type { PublicContext } from './publicContext'
import SiteFrame from './SiteFrame'
import { pageBackground } from './theme'
import './site.css'

export default function PublicLayout() {
  const [site, setSite] = useState<PublicSite | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(() => siteApi.getPublicSite()
    .then(setSite, (e: unknown) => setError(errorMessage(e, 'Impossibile caricare il sito.'))), [])
  useEffect(() => { void load() }, [load])
  const retry = () => { setError(''); void load() }

  // Il colore di sfondo della pagina segue il tema (si vede nello scroll elastico dei telefoni).
  const background = site?.content.theme.background
  const studioName = site?.content.studioName
  useEffect(() => {
    if (!background) return
    const root = document.documentElement
    root.style.backgroundColor = pageBackground(background)
    return () => { root.style.backgroundColor = '' }
  }, [background])
  useEffect(() => { if (studioName) document.title = studioName + ' · Studio di tatuaggi' }, [studioName])

  if (!site) return <div className="site-loading" role={error ? 'alert' : 'status'}>
    {error ? <><p>{error}</p><button type="button" onClick={retry}>Riprova</button></> : <span className="site-spinner" aria-label="Caricamento" />}
  </div>

  const context: PublicContext = { site }
  return <SiteFrame site={site}><Outlet context={context} /></SiteFrame>
}
