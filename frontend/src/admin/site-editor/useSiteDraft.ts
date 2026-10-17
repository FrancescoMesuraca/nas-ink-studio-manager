import { useEffect, useState } from 'react'
import { ApiError, errorMessage, siteApi, type ArtistProfile, type PublicSite, type SiteContent } from '../../api'
import { useLeaveGuard } from '../../shared/useLeaveGuard'

/** Applica una modifica alla bozza: riceve i contenuti attuali e restituisce quelli nuovi. */
export type SiteUpdate = (change: (content: SiteContent) => SiteContent) => void
export type SaveMessage = { kind: 'ok' | 'error'; text: string }

/** Props comuni a tutti i pannelli dell'editor. */
export type PanelProps = {
  draft: SiteContent
  update: SiteUpdate
  /** Errori di validazione restituiti dal salvataggio, per campo. */
  errors: Record<string, string>
}

/**
 * Stato dell'editor del sito: carica i contenuti, tiene la bozza modificata
 * (`draft`) separata da quella pubblicata (`site.content`), salva e annulla.
 * Con modifiche non salvate chiede conferma prima di uscire.
 */
export function useSiteDraft() {
  const [site, setSite] = useState<PublicSite | null>(null)
  const [draft, setDraft] = useState<SiteContent | null>(null)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<SaveMessage | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    siteApi.getPublicSite().then(
      (loaded) => { setSite(loaded); setDraft(loaded.content) },
      (e: unknown) => setLoadError(errorMessage(e, 'Impossibile caricare i contenuti del sito.')),
    )
  }, [])

  const dirty = !!site && !!draft && JSON.stringify(site.content) !== JSON.stringify(draft)
  useLeaveGuard(dirty, 'Ci sono modifiche non salvate al sito. Vuoi uscire e perderle?')

  const update: SiteUpdate = (change) => {
    setDraft((current) => current && change(current))
    setMessage(null)
  }

  const save = async () => {
    if (!site || !draft) return
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

  const discard = () => {
    if (site) setDraft(site.content)
    setFieldErrors({})
    setMessage(null)
  }

  return { site, draft, loadError, dirty, saving, message, fieldErrors, update, save, discard }
}

/** Profilo del tatuatore nella bozza; vuoto se non è ancora stato compilato. */
export const artistProfile = (content: SiteContent, artistId: string): ArtistProfile =>
  content.artistProfiles.find((item) => item.artistId === artistId) ?? { artistId }

/** Il sito come apparirà dopo il salvataggio: contenuti della bozza, profili uniti a nome e colore dei tatuatori. */
export function previewSite(site: PublicSite, draft: SiteContent): PublicSite {
  return {
    ...site,
    content: draft,
    artists: site.artists.map(({ id, name, color }) => {
      const { bio, photoUrl, instagram } = artistProfile(draft, id)
      return { id, name, color, bio: bio || undefined, photoUrl: photoUrl || undefined, instagram: instagram || undefined }
    }),
  }
}
