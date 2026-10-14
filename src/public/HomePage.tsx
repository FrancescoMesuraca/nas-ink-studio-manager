import { useEffect } from 'react'
import { useLocation } from 'react-router'
import HomeSections from './HomeSections'
import { usePublicSite } from './publicContext'

export default function HomePage() {
  const site = usePublicSite()
  const { hash } = useLocation()
  // I link del menu sono "/#sezione": scorre alla sezione anche arrivando da un'altra pagina.
  useEffect(() => {
    if (hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }, [hash])
  return <HomeSections site={site} />
}
