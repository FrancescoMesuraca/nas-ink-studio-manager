// Stub HTTP del sito vetrina.
//
//   GET /site/public   → PublicSite        pubblico, cacheabile; non espone dati del gestionale
//   PUT /site          SiteContent → SiteContent   solo titolare (403 altrimenti), 400 se non valido
import { http } from '../client'
import type { PublicSite, SiteContent } from '../types'
import type { SiteApi } from './siteApi'

export const siteApiHttp: SiteApi = {
  getPublicSite: () => http<PublicSite>('GET', '/site/public'),
  saveContent: (content) => http<SiteContent>('PUT', '/site', content),
}
