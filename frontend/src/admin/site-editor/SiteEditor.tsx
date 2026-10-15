import { useEffect, useState, type ReactNode } from 'react'
import { useBlocker } from 'react-router'
import { ApiError, errorMessage, siteApi, type ArtistProfile, type GalleryItem, type PublicSite, type SiteContent, type SiteSectionId } from '../../api'
import HomeSections from '../../public/HomeSections'
import SiteFrame from '../../public/SiteFrame'
import ImageField from './ImageField'
import './siteEditor.css'

const sectionNames: Record<SiteSectionId, string> = { about: 'Lo studio', gallery: 'Galleria lavori', artists: 'Tatuatori', contacts: 'Contatti e orari' }
const fontNames: Record<SiteContent['theme']['font'], string> = { classic: 'Classico', modern: 'Moderno', bold: 'Deciso' }
const newId = () => crypto.randomUUID()
const move = <T,>(list: T[], index: number, delta: number) => {
  const next = [...list], target = index + delta
  if (target < 0 || target >= list.length) return list
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

export default function SiteEditor() {
  const [site, setSite] = useState<PublicSite | null>(null)
  const [draft, setDraft] = useState<SiteContent | null>(null)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [device, setDevice] = useState<'phone' | 'desktop'>('phone')

  useEffect(() => {
    siteApi.getPublicSite().then((loaded) => { setSite(loaded); setDraft(loaded.content) }, (e: unknown) => setLoadError(errorMessage(e, 'Impossibile caricare i contenuti del sito.')))
  }, [])

  const dirty = !!site && !!draft && JSON.stringify(site.content) !== JSON.stringify(draft)
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname)
  useEffect(() => {
    if (blocker.state !== 'blocked') return
    if (window.confirm('Ci sono modifiche non salvate al sito. Vuoi uscire e perderle?')) blocker.proceed()
    else blocker.reset()
  }, [blocker])
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  if (loadError) return <p className="error" role="alert">{loadError}</p>
  if (!site || !draft) return <p className="empty" role="status">Caricamento…</p>

  const update = (change: (content: SiteContent) => SiteContent) => { setDraft(change(draft)); setMessage(null) }
  const profile = (artistId: string): ArtistProfile => draft.artistProfiles.find((item) => item.artistId === artistId) ?? { artistId }
  const setProfile = (artistId: string, fields: Partial<ArtistProfile>) => update((content) => ({
    ...content,
    artistProfiles: [...content.artistProfiles.filter((item) => item.artistId !== artistId), { ...profile(artistId), ...fields }],
  }))
  const setGallery = (gallery: GalleryItem[]) => update((content) => ({ ...content, gallery }))
  const preview: PublicSite = {
    ...site,
    content: draft,
    artists: site.artists.map(({ id, name, color }) => {
      const { bio, photoUrl, instagram } = profile(id)
      return { id, name, color, bio: bio || undefined, photoUrl: photoUrl || undefined, instagram: instagram || undefined }
    }),
  }

  const save = async () => {
    setSaving(true)
    setMessage(null)
    setFieldErrors({})
    try {
      const saved = await siteApi.saveContent(draft)
      setSite({ ...site, content: saved })
      setDraft(saved)
      setMessage({ kind: 'ok', text: 'Modifiche salvate: il sito pubblico è aggiornato.' })
    } catch (e) {
      if (e instanceof ApiError && e.fields) setFieldErrors(e.fields)
      setMessage({ kind: 'error', text: errorMessage(e, 'Salvataggio non riuscito.') })
    } finally {
      setSaving(false)
    }
  }
  const discard = () => { setDraft(site.content); setFieldErrors({}); setMessage(null) }
  const err = (key: string) => fieldErrors[key] && <p className="field-error">{fieldErrors[key]}</p>

  return <section className="site-editor">
    <div className="section-title"><div><h2>Sito vetrina</h2><p>Modifica testi, foto, colori e sezioni. L’anteprima si aggiorna mentre scrivi; il sito pubblico cambia solo quando salvi.</p></div><a className="editor-open" href="/" target="_blank" rel="noreferrer">Apri il sito ↗</a></div>
    <div className="editor-grid">
      <form className="editor-form" onSubmit={(e) => { e.preventDefault(); void save() }}>
        <Panel title="Identità e tema" open>
          <label>Nome dello studio<input value={draft.studioName} onChange={(e) => update((c) => ({ ...c, studioName: e.target.value }))} aria-invalid={!!fieldErrors.studioName || undefined} /></label>{err('studioName')}
          <ImageField label="Logo" optional value={draft.logoUrl} onChange={(logoUrl) => update((c) => ({ ...c, logoUrl: logoUrl || undefined }))} />
          <div className="two">
            <label>Colore principale<span className="color-row"><input type="color" value={draft.theme.accent} onChange={(e) => update((c) => ({ ...c, theme: { ...c.theme, accent: e.target.value } }))} aria-label="Scegli il colore" /><input value={draft.theme.accent} onChange={(e) => update((c) => ({ ...c, theme: { ...c.theme, accent: e.target.value } }))} aria-label="Colore esadecimale" /></span></label>
            <fieldset className="choice"><legend>Sfondo</legend>{(['dark', 'light'] as const).map((value) => <label key={value}><input type="radio" name="background" checked={draft.theme.background === value} onChange={() => update((c) => ({ ...c, theme: { ...c.theme, background: value } }))} />{value === 'dark' ? 'Scuro' : 'Chiaro'}</label>)}</fieldset>
          </div>{err('accent')}
          <fieldset className="choice"><legend>Carattere dei titoli</legend>{(['classic', 'modern', 'bold'] as const).map((value) => <label key={value} className={'font-' + value}><input type="radio" name="font" checked={draft.theme.font === value} onChange={() => update((c) => ({ ...c, theme: { ...c.theme, font: value } }))} />{fontNames[value]}</label>)}</fieldset>
        </Panel>

        <Panel title="Copertina">
          <label>Titolo<input value={draft.hero.title} onChange={(e) => update((c) => ({ ...c, hero: { ...c.hero, title: e.target.value } }))} aria-invalid={!!fieldErrors.heroTitle || undefined} /></label>{err('heroTitle')}
          <label>Sottotitolo<textarea value={draft.hero.subtitle} onChange={(e) => update((c) => ({ ...c, hero: { ...c.hero, subtitle: e.target.value } }))} /></label>
          <label>Testo del pulsante<input value={draft.hero.ctaLabel} onChange={(e) => update((c) => ({ ...c, hero: { ...c.hero, ctaLabel: e.target.value } }))} aria-invalid={!!fieldErrors.ctaLabel || undefined} /></label>{err('ctaLabel')}
          <ImageField label="Immagine di sfondo" value={draft.hero.imageUrl} onChange={(imageUrl) => update((c) => ({ ...c, hero: { ...c.hero, imageUrl } }))} />
        </Panel>

        <Panel title="Sezioni e ordine">
          <p className="hint">L’ordine qui è l’ordine nella pagina. Le sezioni nascoste restano salvate.</p>
          <ol className="editor-list">{draft.sections.map((section, index) => <li key={section.id}>
            <label className="inline-check"><input type="checkbox" checked={section.visible} onChange={(e) => update((c) => ({ ...c, sections: c.sections.map((item) => item.id === section.id ? { ...item, visible: e.target.checked } : item) }))} />{sectionNames[section.id]}</label>
            <span className="order-buttons">
              <button type="button" className="secondary" disabled={index === 0} aria-label={'Sposta su ' + sectionNames[section.id]} onClick={() => update((c) => ({ ...c, sections: move(c.sections, index, -1) }))}>↑</button>
              <button type="button" className="secondary" disabled={index === draft.sections.length - 1} aria-label={'Sposta giù ' + sectionNames[section.id]} onClick={() => update((c) => ({ ...c, sections: move(c.sections, index, 1) }))}>↓</button>
            </span>
          </li>)}</ol>
        </Panel>

        <Panel title="Lo studio">
          <label>Titolo<input value={draft.about.title} onChange={(e) => update((c) => ({ ...c, about: { ...c.about, title: e.target.value } }))} /></label>
          <label>Testo<textarea rows={8} value={draft.about.text} onChange={(e) => update((c) => ({ ...c, about: { ...c.about, text: e.target.value } }))} /></label>
          <p className="hint">Lascia una riga vuota per iniziare un nuovo paragrafo.</p>
          <ImageField label="Foto" optional value={draft.about.imageUrl} onChange={(imageUrl) => update((c) => ({ ...c, about: { ...c.about, imageUrl: imageUrl || undefined } }))} />
        </Panel>

        <Panel title={'Galleria (' + draft.gallery.length + ')'}>
          {err('gallery')}
          <ol className="editor-list gallery-list">{draft.gallery.map((item, index) => <li key={item.id}>
            <ImageField label={'Foto ' + (index + 1)} value={item.imageUrl} onChange={(imageUrl) => setGallery(draft.gallery.map((other) => other.id === item.id ? { ...other, imageUrl } : other))} />
            <div className="two">
              <label>Didascalia<input value={item.caption ?? ''} onChange={(e) => setGallery(draft.gallery.map((other) => other.id === item.id ? { ...other, caption: e.target.value } : other))} /></label>
              <label>Tatuatore<select value={item.artistId ?? ''} onChange={(e) => setGallery(draft.gallery.map((other) => other.id === item.id ? { ...other, artistId: e.target.value || undefined } : other))}><option value="">—</option>{site.artists.map((artist) => <option key={artist.id} value={artist.id}>{artist.name}</option>)}</select></label>
            </div>
            <span className="order-buttons">
              <button type="button" className="secondary" disabled={index === 0} aria-label={'Sposta su foto ' + (index + 1)} onClick={() => setGallery(move(draft.gallery, index, -1))}>↑</button>
              <button type="button" className="secondary" disabled={index === draft.gallery.length - 1} aria-label={'Sposta giù foto ' + (index + 1)} onClick={() => setGallery(move(draft.gallery, index, 1))}>↓</button>
              <button type="button" className="link danger-text" onClick={() => setGallery(draft.gallery.filter((other) => other.id !== item.id))}>Rimuovi foto</button>
            </span>
          </li>)}</ol>
          <button type="button" className="secondary" onClick={() => setGallery([...draft.gallery, { id: newId(), imageUrl: '' }])}>Aggiungi foto</button>
        </Panel>

        <Panel title="Tatuatori">
          <p className="hint">Nome e colore si modificano in Configurazione. Qui aggiungi bio, foto e profilo Instagram.</p>
          {site.artists.length === 0 && <p className="empty">Nessun tatuatore configurato.</p>}
          {site.artists.map((artist) => <div className="artist-profile" key={artist.id}>
            <h4><i style={{ background: artist.color }} />{artist.name}</h4>
            <label>Bio<textarea value={profile(artist.id).bio ?? ''} onChange={(e) => setProfile(artist.id, { bio: e.target.value })} /></label>
            <label>Instagram<input placeholder="nomeutente" value={profile(artist.id).instagram ?? ''} onChange={(e) => setProfile(artist.id, { instagram: e.target.value })} /></label>
            <ImageField label="Foto" optional value={profile(artist.id).photoUrl} onChange={(photoUrl) => setProfile(artist.id, { photoUrl: photoUrl || undefined })} />
          </div>)}
        </Panel>

        <Panel title="Contatti">
          <label>Indirizzo<input value={draft.contacts.address} onChange={(e) => update((c) => ({ ...c, contacts: { ...c.contacts, address: e.target.value } }))} /></label>
          <div className="two">
            <label>Telefono<input type="tel" value={draft.contacts.phone} onChange={(e) => update((c) => ({ ...c, contacts: { ...c.contacts, phone: e.target.value } }))} /></label>
            <label>Email<input type="email" value={draft.contacts.email} onChange={(e) => update((c) => ({ ...c, contacts: { ...c.contacts, email: e.target.value } }))} aria-invalid={!!fieldErrors.email || undefined} /></label>
          </div>{err('email')}
          <div className="two">
            <label>Instagram<input placeholder="nomeutente" value={draft.contacts.instagram ?? ''} onChange={(e) => update((c) => ({ ...c, contacts: { ...c.contacts, instagram: e.target.value || undefined } }))} /></label>
            <label>Link alla mappa<input type="url" value={draft.contacts.mapUrl ?? ''} onChange={(e) => update((c) => ({ ...c, contacts: { ...c.contacts, mapUrl: e.target.value || undefined } }))} /></label>
          </div>
          <p className="hint">Gli orari mostrati sul sito sono quelli dello studio ({site.hours.start}–{site.hours.end}), modificabili in Configurazione.</p>
        </Panel>

        <div className="editor-savebar">
          {message ? <p className={message.kind === 'ok' ? 'save-ok' : 'save-error'} role={message.kind === 'ok' ? 'status' : 'alert'}>{message.text}</p>
            : <p className="hint" role="status">{dirty ? 'Modifiche non salvate' : 'Nessuna modifica'}</p>}
          <div className="actions">
            <button disabled={!dirty || saving}>{saving ? 'Salvataggio…' : 'Salva'}</button>
            <button type="button" className="secondary" disabled={!dirty || saving} onClick={discard}>Annulla modifiche</button>
          </div>
        </div>
      </form>

      <div className="editor-preview">
        <div className="preview-toolbar" role="group" aria-label="Dimensione anteprima">
          <span>Anteprima</span>
          <button type="button" className={device === 'phone' ? '' : 'secondary'} aria-pressed={device === 'phone'} onClick={() => setDevice('phone')}>Telefono</button>
          <button type="button" className={device === 'desktop' ? '' : 'secondary'} aria-pressed={device === 'desktop'} onClick={() => setDevice('desktop')}>Computer</button>
        </div>
        <div className={'preview-frame ' + device} aria-label="Anteprima del sito">
          <SiteFrame site={preview} preview><HomeSections site={preview} /></SiteFrame>
        </div>
      </div>
    </div>
  </section>
}

function Panel({ title, open = false, children }: { title: string; open?: boolean; children: ReactNode }) {
  return <details className="card editor-panel" open={open}>
    <summary>{title}</summary>
    <div className="form">{children}</div>
  </details>
}
