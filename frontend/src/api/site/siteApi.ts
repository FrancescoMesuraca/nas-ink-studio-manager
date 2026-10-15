import type { PublicSite, SiteContent } from '../types'

/** Contenuti del sito vetrina. */
export interface SiteApi {
  /** Pubblico: contenuti + tatuatori (nome, colore, bio, foto) + orari dello studio. */
  getPublicSite(): Promise<PublicSite>
  /** Solo titolare. 400 se i contenuti non sono validi. */
  saveContent(content: SiteContent): Promise<SiteContent>
}
