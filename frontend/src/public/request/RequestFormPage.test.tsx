import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { studioApi } from '../../api'
import { renderRoute } from '../../test/renderRoute'

describe('modulo “Richiedi un tatuaggio”', () => {
  it('la home porta al modulo', async () => {
    const { router } = renderRoute('/')
    const hero = await screen.findByRole('heading', { level: 1 })
    expect(hero).toHaveTextContent('Tatuaggi su misura')
    await userEvent.click(screen.getAllByRole('link', { name: 'Richiedi un tatuaggio' })[1])
    expect(router.state.location.pathname).toBe('/richiesta')
  })

  it('mostra gli errori e mette il focus sul primo campo da correggere', async () => {
    renderRoute('/richiesta')
    await userEvent.click(await screen.findByRole('button', { name: 'Invia richiesta' }))
    expect(screen.getByText('Ci sono 6 campi da sistemare.')).toBeInTheDocument()
    expect(screen.getByLabelText(/Nome e cognome/)).toHaveFocus()
    expect(screen.getByLabelText(/Nome e cognome/)).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Lasciaci almeno un recapito: email o telefono.', { selector: '.request-error' })).toBeInTheDocument()
    expect(screen.getByText(/devi accettare l’informativa privacy/)).toBeInTheDocument()
  })

  it('invia la richiesta, mostra la conferma e la rende visibile nel gestionale', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/richiesta?tatuatore=artist-2')
    expect(await screen.findByLabelText('Tatuatore preferito')).toHaveValue('artist-2')

    await user.type(screen.getByLabelText(/Nome e cognome/), 'Giorgia Verdi')
    await user.type(screen.getByLabelText('Telefono'), '+39 333 765 4321')
    await user.type(screen.getByLabelText(/Descrivi la tua idea/), 'Un ramo di ciliegio sulla spalla, delicato.')
    await user.type(screen.getByLabelText(/Zona del corpo/), 'Spalla')
    await user.selectOptions(screen.getByLabelText(/Dimensioni indicative/), 'Medio (5–15 cm)')
    await user.selectOptions(screen.getByLabelText('Stile'), 'Giapponese')
    await user.type(screen.getByLabelText('Disponibilità indicativa'), 'Venerdì pomeriggio')
    await user.click(screen.getByRole('checkbox', { name: /informativa privacy/ }))
    await user.click(screen.getByRole('button', { name: 'Invia richiesta' }))

    expect(await screen.findByRole('heading', { name: 'Grazie, Giorgia!' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/richiesta/inviata')

    const saved = (await studioApi.getData()).requests.at(-1)
    expect(saved).toMatchObject({
      name: 'Giorgia Verdi', phone: '+39 333 765 4321', contact: '+39 333 765 4321', bodyArea: 'Spalla',
      size: 'Medio (5–15 cm)', style: 'Giapponese', preferredArtistId: 'artist-2', availability: 'Venerdì pomeriggio',
      status: 'nuova', source: 'sito', referenceImages: [],
    })

    // Il titolare entra nel gestionale e trova la richiesta.
    await router.navigate('/gestionale/richieste/' + saved!.id)
    await user.type(await screen.findByLabelText('Email'), 'titolare@nasink.demo')
    await user.type(screen.getByLabelText('Password'), 'demo1234')
    await user.click(screen.getByRole('button', { name: 'Accedi' }))
    const detail = await screen.findByRole('heading', { name: 'Giorgia Verdi', level: 2 })
    const card = detail.closest('article')!
    expect(within(card).getByText('Dal sito')).toBeInTheDocument()
    expect(card).toHaveTextContent('Tatuatore preferito: Luca Neri')
    expect(card).toHaveTextContent('Disponibilità: Venerdì pomeriggio')
  })
})
