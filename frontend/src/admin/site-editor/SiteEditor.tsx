import AboutPanel from './panels/AboutPanel'
import ArtistsPanel from './panels/ArtistsPanel'
import ContactsPanel from './panels/ContactsPanel'
import GalleryPanel from './panels/GalleryPanel'
import HeroPanel from './panels/HeroPanel'
import IdentityPanel from './panels/IdentityPanel'
import SectionsPanel from './panels/SectionsPanel'
import PreviewPane from './PreviewPane'
import SaveBar from './SaveBar'
import { previewSite, useSiteDraft, type PanelProps } from './useSiteDraft'
import './siteEditor.css'

/** Editor del sito vetrina: modulo a pannelli a sinistra, anteprima live a destra. */
export default function SiteEditor() {
  const { site, draft, loadError, dirty, saving, message, fieldErrors, update, save, discard } = useSiteDraft()

  if (loadError) return <p className="error" role="alert">{loadError}</p>
  if (!site || !draft) return <p className="empty" role="status">Caricamento…</p>

  const panel: PanelProps = { draft, update, errors: fieldErrors }

  return <section className="site-editor">
    <div className="section-title">
      <div>
        <h2>Sito vetrina</h2>
        <p>Modifica testi, foto, colori e sezioni. L’anteprima si aggiorna mentre scrivi; il sito pubblico cambia solo quando salvi.</p>
      </div>
      <a className="editor-open" href="/" target="_blank" rel="noreferrer">Apri il sito ↗</a>
    </div>
    <div className="editor-grid">
      <form className="editor-form" onSubmit={(e) => { e.preventDefault(); void save() }}>
        <IdentityPanel {...panel} />
        <HeroPanel {...panel} />
        <SectionsPanel {...panel} />
        <AboutPanel {...panel} />
        <GalleryPanel {...panel} artists={site.artists} />
        <ArtistsPanel {...panel} artists={site.artists} />
        <ContactsPanel {...panel} hours={site.hours} />
        <SaveBar dirty={dirty} saving={saving} message={message} onDiscard={discard} />
      </form>
      <PreviewPane site={previewSite(site, draft)} />
    </div>
  </section>
}
