// Stub HTTP del gestionale. Documenta gli endpoint previsti; tutti richiedono autenticazione.
// Le modifiche alla configurazione (orari, stanze, lettini, tatuatori, reset) sono riservate al ruolo `titolare`.
//
//   GET    /studio                       → StudioData
//   POST   /studio/reset                 → StudioData        (solo ambienti demo)
//   PUT    /studio/hours                 { start, end }
//   POST   /studio/rooms                 { name }
//   PATCH  /studio/rooms/:id             { name }
//   DELETE /studio/rooms/:id                                  409 se ha lettini usati in prenotazioni
//   POST   /studio/rooms/:roomId/beds    { name }
//   PATCH  /studio/beds/:id              { name }
//   DELETE /studio/beds/:id                                   409 se usato in prenotazioni
//   POST   /studio/artists               { name, color }
//   PUT    /studio/artists/:id           { name, color }
//   DELETE /studio/artists/:id                                409 se usato in prenotazioni o consulenze
//   POST   /studio/bookings              Omit<Booking, 'id'>  409 con messaggio in caso di conflitto
//   PUT    /studio/bookings/:id          Booking
//   DELETE /studio/bookings/:id
//
// Le modifiche possono rispondere 204: lo stub rilegge GET /studio per restituire lo stato aggiornato.
import { http } from '../client'
import type { StudioData } from '../types'
import type { StudioApi } from './studioApi'

const getData = () => http<StudioData>('GET', '/studio')
const send = async (method: 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, body?: unknown) => {
  await http<unknown>(method, path, body)
  return getData()
}
const id = encodeURIComponent

export const studioApiHttp: StudioApi = {
  getData,
  reset: () => http<StudioData>('POST', '/studio/reset'),
  setHours: (hours) => send('PUT', '/studio/hours', hours),
  addRoom: (name) => send('POST', '/studio/rooms', { name }),
  renameRoom: (roomId, name) => send('PATCH', '/studio/rooms/' + id(roomId), { name }),
  removeRoom: (roomId) => send('DELETE', '/studio/rooms/' + id(roomId)),
  addBed: (roomId, name) => send('POST', '/studio/rooms/' + id(roomId) + '/beds', { name }),
  renameBed: (bedId, name) => send('PATCH', '/studio/beds/' + id(bedId), { name }),
  removeBed: (bedId) => send('DELETE', '/studio/beds/' + id(bedId)),
  addArtist: (artist) => send('POST', '/studio/artists', artist),
  updateArtist: (artistId, artist) => send('PUT', '/studio/artists/' + id(artistId), artist),
  removeArtist: (artistId) => send('DELETE', '/studio/artists/' + id(artistId)),
  saveBooking: ({ id: bookingId, ...booking }) => bookingId
    ? send('PUT', '/studio/bookings/' + id(bookingId), { id: bookingId, ...booking })
    : send('POST', '/studio/bookings', booking),
  removeBooking: (bookingId) => send('DELETE', '/studio/bookings/' + id(bookingId)),
}
