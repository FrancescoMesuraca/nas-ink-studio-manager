import seed from '../mock/seed/site.json'
import { requireMockRole } from '../auth/authApi.mock'
import { clone, readJson, simulate, writeJson } from '../mock/storage'
import { loadStudio } from '../mock/studioStore'
import { ApiError, type SiteContent, type SiteSectionId } from '../types'
import type { SiteApi } from './siteApi'

export const siteKey = 'nas-ink-site-content'
const sectionIds: SiteSectionId[] = ['about', 'gallery', 'artists', 'contacts']

export const seedSite = () => clone(seed as SiteContent)

/** Contenuti salvati, completati con i valori demo per i campi mancanti (versioni precedenti). */
export function loadSite(): SiteContent {
  const saved = readJson<Partial<SiteContent>>(siteKey)
  const base = seedSite()
  if (!saved) return base
  const sections = (saved.sections ?? []).filter((section) => sectionIds.includes(section.id))
  for (const id of sectionIds) if (!sections.some((section) => section.id === id)) sections.push({ id, visible: true })
  return {
    ...base, ...saved,
    theme: { ...base.theme, ...saved.theme },
    hero: { ...base.hero, ...saved.hero },
    about: { ...base.about, ...saved.about },
    contacts: { ...base.contacts, ...saved.contacts },
    gallery: saved.gallery ?? base.gallery,
    artistProfiles: saved.artistProfiles ?? base.artistProfiles,
    sections,
  }
}

export function validateSite(content: SiteContent) {
  const fields: Record<string, string> = {}
  if (!content.studioName.trim()) fields.studioName = 'Inserisci il nome dello studio.'
  if (!/^#[0-9a-f]{6}$/i.test(content.theme.accent)) fields.accent = 'Il colore deve essere nel formato #rrggbb.'
  if (!content.hero.title.trim()) fields.heroTitle = 'Inserisci il titolo principale.'
  if (!content.hero.ctaLabel.trim()) fields.ctaLabel = 'Inserisci il testo del pulsante.'
  if (content.contacts.email && !/^\S+@\S+\.\S+$/.test(content.contacts.email)) fields.email = 'Email dello studio non valida.'
  if (content.gallery.some((item) => !item.imageUrl)) fields.gallery = 'Ogni foto della galleria deve avere un’immagine.'
  const ids = content.sections.map((section) => section.id)
  if (ids.length !== sectionIds.length || sectionIds.some((id) => !ids.includes(id))) fields.sections = 'Elenco delle sezioni non valido.'
  return fields
}

export const siteApiMock: SiteApi = {
  getPublicSite: () => simulate(() => {
    const content = loadSite()
    const studio = loadStudio()
    const artists = studio.artists.map((artist) => {
      const profile = content.artistProfiles.find((item) => item.artistId === artist.id)
      return { ...artist, bio: profile?.bio, photoUrl: profile?.photoUrl, instagram: profile?.instagram }
    })
    return { content, artists, hours: studio.hours }
  }),
  saveContent: (content) => simulate(() => {
    requireMockRole('titolare')
    const fields = validateSite(content)
    const first = Object.values(fields)[0]
    if (first) throw new ApiError(400, first, fields)
    writeJson(siteKey, content)
    return clone(content)
  }),
}
