import { describe, expect, it } from 'vitest'
import { bookingConflict, overlaps, timeRangeError } from './bookingRules.js'

const existing = [{ id: 'a', date: '2026-09-27', start: '10:00', end: '11:00', bedId: 'bed-a', artistId: 'artist-a' }]
const next = { date: '2026-09-27', start: '11:00', end: '12:00', bedId: 'bed-a', artistId: 'artist-a' }
const hours = { start: '09:00', end: '23:00' }

describe('bookingRules', () => {
  it('le fasce consecutive sono valide', () => {
    expect(bookingConflict(next, existing)).toBeNull()
  })

  it('blocca sovrapposizioni sullo stesso lettino', () => {
    expect(bookingConflict({ ...next, start: '10:30' }, existing)).toBe('Il lettino è già occupato in questa fascia oraria.')
  })

  it('un tatuatore non può essere su due lettini insieme', () => {
    expect(bookingConflict({ ...next, start: '10:30', end: '11:30', bedId: 'bed-b' }, existing)).toBe('Il tatuatore ha già una prenotazione in questa fascia oraria.')
  })

  it('stessa fascia ma giorno diverso: nessun conflitto', () => {
    expect(bookingConflict({ ...next, date: '2026-09-28', start: '10:00' }, existing)).toBeNull()
    expect(overlaps({ date: '2026-09-28', start: '10:00', end: '11:00' }, existing[0])).toBe(false)
  })

  it('controlla gli orari dello studio e l’ordine inizio/fine', () => {
    expect(timeRangeError({ date: next.date, start: '22:00', end: '22:30' }, hours)).toBeNull()
    expect(timeRangeError({ date: next.date, start: '22:00', end: '22:30' }, { start: '09:00', end: '19:00' })).toBe('Scegli un orario tra 09:00 e 19:00.')
    expect(timeRangeError({ date: next.date, start: '12:00', end: '11:00' }, hours)).toBe('L’orario di fine deve essere successivo a quello di inizio.')
  })
})
