import { describe, expect, it } from 'vitest'
import { authApi, siteApi } from '..'

describe('siteApi (mock)', () => {
  it('il sito pubblico unisce tatuatori del gestionale e profili, senza dati riservati', async () => {
    const site = await siteApi.getPublicSite()
    expect(Object.keys(site).sort()).toEqual(['artists', 'content', 'hours'])
    expect(site.hours).toEqual({ start: '09:00', end: '23:00' })
    expect(site.artists[0]).toMatchObject({ id: 'artist-1', name: 'Maya Conti', color: '#d85a7f', instagram: 'maya.ink' })
    expect(site.content.sections.map((section) => section.id)).toEqual(['about', 'gallery', 'artists', 'contacts'])
  })

  it('solo il titolare può salvare', async () => {
    const { content } = await siteApi.getPublicSite()
    await expect(siteApi.saveContent(content)).rejects.toMatchObject({ status: 401 })
    await authApi.login('maya@nasink.demo', 'demo1234')
    await expect(siteApi.saveContent(content)).rejects.toMatchObject({ status: 403 })
  })

  it('il titolare salva e il sito pubblico si aggiorna', async () => {
    await authApi.login('titolare@nasink.demo', 'demo1234')
    const { content } = await siteApi.getPublicSite()
    await siteApi.saveContent({ ...content, hero: { ...content.hero, title: 'Nuovo titolo' }, sections: [...content.sections].reverse() })
    const site = await siteApi.getPublicSite()
    expect(site.content.hero.title).toBe('Nuovo titolo')
    expect(site.content.sections[0].id).toBe('contacts')
  })

  it('rifiuta contenuti non validi con l’elenco dei campi', async () => {
    await authApi.login('titolare@nasink.demo', 'demo1234')
    const { content } = await siteApi.getPublicSite()
    await expect(siteApi.saveContent({ ...content, studioName: ' ', theme: { ...content.theme, accent: 'rosso' } }))
      .rejects.toMatchObject({ status: 400, fields: { studioName: expect.any(String), accent: expect.any(String) } })
  })

  it('completa i contenuti salvati da versioni precedenti', async () => {
    localStorage.setItem('nas-ink-site-content', JSON.stringify({ studioName: 'Vecchio', sections: [{ id: 'gallery', visible: false }] }))
    const { content } = await siteApi.getPublicSite()
    expect(content.studioName).toBe('Vecchio')
    expect(content.hero.ctaLabel).toBe('Richiedi un tatuaggio')
    expect(content.sections).toEqual([{ id: 'gallery', visible: false }, { id: 'about', visible: true }, { id: 'artists', visible: true }, { id: 'contacts', visible: true }])
  })
})
