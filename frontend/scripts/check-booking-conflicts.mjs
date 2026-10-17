import assert from 'node:assert/strict'
import { bookingConflict, overlaps, timeRangeError } from '../src/services/bookingRules.js'

const bookings = [{ id: 'a', date: '2026-09-27', start: '10:00', end: '11:00', bedId: 'bed-a', artistId: 'artist-a' }]
const next = { date: '2026-09-27', start: '11:00', end: '12:00', bedId: 'bed-a', artistId: 'artist-a' }
assert.equal(bookingConflict(next, bookings), null, 'Fasce consecutive devono essere valide')
assert.ok(bookingConflict({ ...next, start: '10:30' }, bookings), 'Sovrapposizioni devono essere bloccate')
assert.ok(bookingConflict({ ...next, start: '10:30', end: '11:30', bedId: 'bed-b' }, bookings), 'Un tatuatore non può essere prenotato su due lettini')
assert.equal(timeRangeError({ date: next.date, start: '22:00', end: '22:30' }, { start: '09:00', end: '23:00' }), null, 'Le 22:00 devono rientrare negli orari configurati')
assert.ok(timeRangeError({ date: next.date, start: '22:00', end: '22:30' }, { start: '09:00', end: '19:00' }), 'Fuori orario deve essere bloccato')
assert.ok(overlaps({ ...next, start: '10:30', end: '11:30' }, bookings[0]), 'La consulenza deve rilevare un tatuatore occupato')
console.log('Controllo conflitti prenotazioni superato.')
