import type { PublicSite, SiteSectionId } from '../api'

/** Ancora nella pagina ed etichetta di menu di ogni sezione. */
export const sectionMeta: Record<SiteSectionId, { anchor: string; label: string }> = {
  about: { anchor: 'studio', label: 'Lo studio' },
  gallery: { anchor: 'lavori', label: 'Lavori' },
  artists: { anchor: 'tatuatori', label: 'Tatuatori' },
  contacts: { anchor: 'contatti', label: 'Contatti' },
}

export const visibleSections = (site: PublicSite) =>
  site.content.sections.filter((section) => section.visible && (section.id !== 'artists' || site.artists.length > 0))

export const hoursText = (site: PublicSite) => 'Su appuntamento, ' + site.hours.start + '–' + site.hours.end

export const instagramUrl = (handle: string) => 'https://www.instagram.com/' + encodeURIComponent(handle.replace(/^@/, '')) + '/'

export const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')
