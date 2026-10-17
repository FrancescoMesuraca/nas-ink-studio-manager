import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { authApi } from '../api'
import { renderRoute } from '../test/renderRoute'

describe('guardie di rotta', () => {
  it('senza sessione il gestionale rimanda al login con redirect', async () => {
    const { router } = renderRoute('/gestionale/richieste')
    await screen.findByRole('heading', { name: 'Area riservata' })
    expect(router.state.location.pathname).toBe('/login')
    expect(router.state.location.search).toBe('?redirect=%2Fgestionale%2Frichieste')
  })

  it('dopo il login torna alla pagina richiesta', async () => {
    const { router } = renderRoute('/gestionale/schede')
    await userEvent.type(await screen.findByLabelText('Email'), 'titolare@nasink.demo')
    await userEvent.type(screen.getByLabelText('Password'), 'demo1234')
    await userEvent.click(screen.getByRole('button', { name: 'Accedi' }))
    expect(await screen.findByRole('heading', { name: 'Schede clienti' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/gestionale/schede')
  })

  it('mostra l’errore con credenziali sbagliate', async () => {
    renderRoute('/login')
    await userEvent.type(await screen.findByLabelText('Email'), 'luca@nasink.demo')
    await userEvent.type(screen.getByLabelText('Password'), 'nope')
    await userEvent.click(screen.getByRole('button', { name: 'Accedi' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Email o password non corretti.')
  })

  it('il tatuatore non vede configurazione né sito vetrina e non può aprirli', async () => {
    await authApi.login('luca@nasink.demo', 'demo1234')
    renderRoute('/gestionale/configurazione')
    expect(await screen.findByRole('heading', { name: 'Accesso non consentito' })).toBeInTheDocument()
    const menu = screen.getByRole('navigation', { name: 'Sezioni' })
    expect(menu).toHaveTextContent('Richieste')
    expect(menu).not.toHaveTextContent('Configurazione')
    expect(menu).not.toHaveTextContent('Sito vetrina')
    expect(screen.queryByRole('button', { name: 'Ripristina dati demo' })).not.toBeInTheDocument()
  })

  it('il tatuatore non apre l’editor del sito', async () => {
    await authApi.login('maya@nasink.demo', 'demo1234')
    renderRoute('/gestionale/sito')
    expect(await screen.findByRole('heading', { name: 'Accesso non consentito' })).toBeInTheDocument()
  })

  it('il titolare vede tutte le sezioni', async () => {
    await authApi.login('titolare@nasink.demo', 'demo1234')
    renderRoute('/gestionale/configurazione')
    expect(await screen.findByRole('heading', { name: 'Orari dello studio' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Sezioni' })).toHaveTextContent('Sito vetrina')
    expect(screen.getByRole('button', { name: 'Ripristina dati demo' })).toBeInTheDocument()
  })

  it('logout riporta al login', async () => {
    await authApi.login('titolare@nasink.demo', 'demo1234')
    const { router } = renderRoute('/gestionale/lettini')
    await userEvent.click(await screen.findByRole('button', { name: 'Esci' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
  })
})
