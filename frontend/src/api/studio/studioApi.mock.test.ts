import { describe, expect, it } from 'vitest'
import { studioApi } from '..'

describe('studioApi (mock)', () => {
  it('blocca una prenotazione sovrapposta sullo stesso lettino', async () => {
    // booking-1: bed-1, 2026-09-27 10:00–12:30
    await expect(studioApi.saveBooking({ id: '', date: '2026-09-27', start: '12:00', end: '13:00', bedId: 'bed-1', artistId: 'artist-2' }))
      .rejects.toMatchObject({ status: 409, message: 'Il lettino è già occupato in questa fascia oraria.' })
  })

  it('blocca una prenotazione sopra una consulenza del tatuatore', async () => {
    // request-1: consulenza artist-1, 2026-09-27 09:00–09:30
    await expect(studioApi.saveBooking({ id: '', date: '2026-09-27', start: '09:00', end: '10:00', bedId: 'bed-4', artistId: 'artist-1' }))
      .rejects.toMatchObject({ message: 'Il tatuatore ha una consulenza in questa fascia oraria.' })
  })

  it('crea e poi elimina una prenotazione libera', async () => {
    const created = await studioApi.saveBooking({ id: '', date: '2026-09-28', start: '10:00', end: '11:00', bedId: 'bed-1', artistId: 'artist-1' })
    const booking = created.bookings.find((item) => item.date === '2026-09-28')!
    expect(booking.id).toBeTruthy()
    const after = await studioApi.removeBooking(booking.id)
    expect(after.bookings.some((item) => item.id === booking.id)).toBe(false)
  })

  it('non accetta orari che escludono appuntamenti esistenti', async () => {
    await expect(studioApi.setHours({ start: '10:00', end: '20:00' })).rejects.toMatchObject({ status: 409 })
    await expect(studioApi.setHours({ start: '20:00', end: '10:00' })).rejects.toMatchObject({ status: 400 })
  })

  it('migra le richieste salvate dalla versione precedente', async () => {
    const seed = await studioApi.getData()
    const old = { ...seed, requests: seed.requests.map(({ id, name, contact, description, bodyArea, size, style, references, status, consultation }) => ({ id, name, contact, description, bodyArea, size, style, references, status, consultation })) }
    localStorage.setItem('nas-ink-studio-data', JSON.stringify(old))
    const data = await studioApi.getData()
    expect(data.requests.every((request) => request.source === 'gestionale' && Array.isArray(request.referenceImages))).toBe(true)
  })

  it('ripristina i dati demo', async () => {
    await studioApi.addRoom('Sala nuova')
    const data = await studioApi.reset()
    expect(data.rooms.map((room) => room.name)).toEqual(['Sala Sakura', 'Sala Koi'])
  })
})
