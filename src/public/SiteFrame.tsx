import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import type { PublicSite } from '../api'
import { hoursText, instagramUrl, sectionMeta, visibleSections } from './siteSections'
import { themeVars } from './theme'
import './site.css'

/**
 * Cornice del sito pubblico (tema, intestazione, piè di pagina).
 * Usata dalle pagine pubbliche e, con `preview`, dall'anteprima nell'editor del sito.
 */
export default function SiteFrame({ site, preview = false, children }: { site: PublicSite; preview?: boolean; children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { content } = site
  const sections = visibleSections(site)
  const close = () => setMenuOpen(false)
  return <div
    className={'site' + (preview ? ' site-preview' : '')}
    style={themeVars(content.theme)}
    // In anteprima i link non devono portare fuori dall'editor.
    onClickCapture={preview ? (event) => { if ((event.target as HTMLElement).closest('a')) event.preventDefault() } : undefined}
  >
    {!preview && <a className="site-skip" href="#contenuto">Vai al contenuto</a>}
    <header className="site-header">
      <div className="site-header-inner">
        <Link className="site-brand" to="/" onClick={close}>
          {content.logoUrl ? <img src={content.logoUrl} alt={content.studioName} /> : <span>{content.studioName}</span>}
        </Link>
        <nav className={'site-nav' + (menuOpen ? ' open' : '')} id="site-menu" aria-label="Menu principale">
          {sections.map((section) => <Link key={section.id} to={{ pathname: '/', hash: sectionMeta[section.id].anchor }} onClick={close}>{sectionMeta[section.id].label}</Link>)}
        </nav>
        <Link className="site-button site-header-cta" to="/richiesta" onClick={close} aria-label={content.hero.ctaLabel}><span className="cta-full">{content.hero.ctaLabel}</span><span className="cta-short" aria-hidden="true">Richiedi</span></Link>
        {sections.length > 0 && <button className="site-menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="site-menu" aria-label={menuOpen ? 'Chiudi menu' : 'Apri menu'} onClick={() => setMenuOpen(!menuOpen)}>
          <span /><span /><span />
        </button>}
      </div>
    </header>
    <main id="contenuto" className="site-main">{children}</main>
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div>
          <p className="site-footer-name">{content.studioName}</p>
          <p>{content.contacts.address}</p>
          <p>{hoursText(site)}</p>
        </div>
        <div className="site-footer-links">
          {content.contacts.phone && <a href={'tel:' + content.contacts.phone.replace(/\s+/g, '')}>{content.contacts.phone}</a>}
          {content.contacts.email && <a href={'mailto:' + content.contacts.email}>{content.contacts.email}</a>}
          {content.contacts.instagram && <a href={instagramUrl(content.contacts.instagram)} target="_blank" rel="noreferrer">Instagram @{content.contacts.instagram.replace(/^@/, '')}</a>}
        </div>
        <div className="site-footer-links">
          <Link to="/privacy">Informativa privacy</Link>
          <Link to="/login">Area riservata</Link>
        </div>
      </div>
      <p className="site-copy">© {new Date().getFullYear()} {content.studioName}</p>
    </footer>
  </div>
}
