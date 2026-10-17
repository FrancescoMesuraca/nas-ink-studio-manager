import { describe, expect, it } from 'vitest'
import { authApi, demoAccounts, hasStoredSession } from '..'
import { ApiError } from '../types'

describe('authApi (mock)', () => {
  it('login con credenziali demo: salva il token e me() restituisce l’utente', async () => {
    const session = await authApi.login('Titolare@NasInk.demo ', 'demo1234')
    expect(session.user).toEqual({ id: 'user-1', name: 'Nadia Sala', email: 'titolare@nasink.demo', role: 'titolare' })
    expect(session.user).not.toHaveProperty('password')
    expect(hasStoredSession()).toBe(true)
    expect(await authApi.me()).toEqual(session.user)
  })

  it('i tatuatori sono collegati a un artista', async () => {
    const { user } = await authApi.login('maya@nasink.demo', 'demo1234')
    expect(user).toMatchObject({ role: 'tatuatore', artistId: 'artist-1' })
  })

  it('password errata → 401, dati mancanti → 400', async () => {
    await expect(authApi.login('maya@nasink.demo', 'sbagliata')).rejects.toMatchObject({ status: 401 })
    await expect(authApi.login('', '')).rejects.toBeInstanceOf(ApiError)
    await expect(authApi.login('', '')).rejects.toMatchObject({ status: 400 })
    expect(hasStoredSession()).toBe(false)
  })

  it('logout cancella la sessione e me() risponde 401', async () => {
    await authApi.login('luca@nasink.demo', 'demo1234')
    await authApi.logout()
    expect(hasStoredSession()).toBe(false)
    await expect(authApi.me()).rejects.toMatchObject({ status: 401 })
  })

  it('un token non valido viene scartato', async () => {
    localStorage.setItem('nas-ink-session-token', 'mock.user-99.x')
    await expect(authApi.me()).rejects.toMatchObject({ status: 401 })
    expect(hasStoredSession()).toBe(false)
  })

  it('espone le credenziali demo in modalità mock', () => {
    expect(demoAccounts.map((account) => account.role)).toEqual(['titolare', 'tatuatore', 'tatuatore'])
  })
})
