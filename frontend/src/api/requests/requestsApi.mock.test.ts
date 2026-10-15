import { describe, expect, it } from 'vitest'
import { authApi, requestsApi, studioApi, type NewRequestInput } from '..'
import { ApiError } from '../types'

const fromSite: NewRequestInput = {
  name: 'Chiara Rossi', email: 'chiara@example.com', phone: '', contact: '', description: 'Una piccola balena in fine line.',
  bodyArea: 'Polso', size: 'Piccolo (fino a 5 cm)', style: 'Non so', references: '', referenceImages: [],
  source: 'sito', privacyConsent: true, preferredArtistId: 'artist-3',
}

const rejection = async (promise: Promise<unknown>) => {
  try { await promise } catch (error) { return error as ApiError }
  throw new Error('La promessa doveva essere rifiutata')
}

describe('requestsApi (mock)', () => {
  it('una richiesta dal sito compare subito nel gestionale come "nuova"', async () => {
    const created = await requestsApi.create(fromSite)
    expect(created).toMatchObject({ status: 'nuova', source: 'sito', contact: 'chiara@example.com', preferredArtistId: 'artist-3' })
    expect(created.createdAt).toBeTruthy()
    expect(created.privacyConsentAt).toBeTruthy()
    expect(created).not.toHaveProperty('privacyConsent')

    const data = await studioApi.getData()
    expect(data.requests.at(-1)).toEqual(created)
  })

  it('richiede almeno un recapito per le richieste dal sito', async () => {
    const error = await rejection(requestsApi.create({ ...fromSite, email: '', phone: '' }))
    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(400)
    expect(error.fields?.contact).toMatch(/recapito/)
  })

  it('richiede il consenso privacy per le richieste dal sito', async () => {
    const error = await rejection(requestsApi.create({ ...fromSite, privacyConsent: false }))
    expect(error.status).toBe(400)
    expect(error.fields?.privacyConsent).toBeDefined()
  })

  it('accetta le richieste del gestionale con il solo contatto libero e senza consenso', async () => {
    const created = await requestsApi.create({ name: 'Marco', contact: '333 000111', description: 'Rosa', bodyArea: 'Braccio', size: '8 cm', style: 'Fine line', references: '', referenceImages: [], source: 'gestionale' })
    expect(created).toMatchObject({ source: 'gestionale', status: 'nuova', contact: '333 000111' })
    expect(created.privacyConsentAt).toBeUndefined()
  })

  it('rifiuta un tatuatore preferito inesistente e troppe immagini', async () => {
    expect((await rejection(requestsApi.create({ ...fromSite, preferredArtistId: 'nessuno' }))).status).toBe(400)
    const tooMany = await rejection(requestsApi.create({ ...fromSite, referenceImages: ['a', 'b', 'c', 'd'] }))
    expect(tooMany.fields?.referenceImages).toBeDefined()
  })

  it('non propone una consulenza sovrapposta a una prenotazione del tatuatore', async () => {
    // booking-1: artist-1, 2026-09-27 10:00–12:30
    const error = await rejection(requestsApi.proposeConsultation('request-2', { artistId: 'artist-1', date: '2026-09-27', start: '11:00', end: '11:30' }))
    expect(error.status).toBe(409)
    expect(error.message).toBe('Il tatuatore è occupato in questa fascia oraria.')
  })

  it('propone e conferma una consulenza libera', async () => {
    await requestsApi.proposeConsultation('request-2', { artistId: 'artist-2', date: '2026-10-01', start: '10:00', end: '10:30' })
    const data = await requestsApi.confirmConsultation('request-2')
    expect(data.requests.find((item) => item.id === 'request-2')).toMatchObject({ status: 'consulenza', consultationSlot: { status: 'confermata' } })
  })

  it('il gestionale resta usabile dopo il login di un tatuatore', async () => {
    await authApi.login('maya@nasink.demo', 'demo1234')
    const data = await requestsApi.setStatus('request-1', 'approvata')
    expect(data.requests[0].status).toBe('approvata')
  })
})
