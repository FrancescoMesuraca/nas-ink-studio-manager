// Ex studioService: stessa logica e stesse regole, ora dietro l'interfaccia StudioApi.
import { bookingConflict, overlaps, timeRangeError } from '../../services/bookingRules.js'
import { hasBookings, loadStudio, saveStudio, seedStudio, slots } from '../mock/studioStore'
import { simulate, uid } from '../mock/storage'
import { ApiError, type StudioData } from '../types'
import type { StudioApi } from './studioApi'

const change = (next: (data: StudioData) => StudioData) => simulate(() => saveStudio(next(loadStudio())))
const fail = (status: number, message: string): never => { throw new ApiError(status, message) }

export const studioApiMock: StudioApi = {
  getData: () => simulate(loadStudio),
  reset: () => simulate(() => saveStudio(seedStudio())),
  setHours: (hours) => change((data) => {
    if (hours.end <= hours.start) fail(400, 'La chiusura deve essere successiva all’apertura.')
    if ([...data.bookings, ...slots(data)].some((item) => timeRangeError(item, hours))) fail(409, 'Alcuni appuntamenti esistenti sono fuori dai nuovi orari dello studio.')
    return { ...data, hours }
  }),
  addRoom: (name) => change((data) => ({ ...data, rooms: [...data.rooms, { id: uid(), name, beds: [] }] })),
  renameRoom: (id, name) => change((data) => ({ ...data, rooms: data.rooms.map((room) => room.id === id ? { ...room, name } : room) })),
  removeRoom: (id) => change((data) => {
    const room = data.rooms.find((item) => item.id === id)
    if (!room) return fail(404, 'Stanza non trovata.')
    if (hasBookings(data, room.beds.map((bed) => bed.id))) fail(409, 'Non puoi eliminare una stanza con lettini usati nelle prenotazioni.')
    return { ...data, rooms: data.rooms.filter((item) => item.id !== id) }
  }),
  addBed: (roomId, name) => change((data) => ({ ...data, rooms: data.rooms.map((room) => room.id === roomId ? { ...room, beds: [...room.beds, { id: uid(), name }] } : room) })),
  renameBed: (id, name) => change((data) => ({ ...data, rooms: data.rooms.map((room) => ({ ...room, beds: room.beds.map((bed) => bed.id === id ? { ...bed, name } : bed) })) })),
  removeBed: (id) => change((data) => {
    if (hasBookings(data, [id])) fail(409, 'Non puoi eliminare un lettino usato nelle prenotazioni.')
    return { ...data, rooms: data.rooms.map((room) => ({ ...room, beds: room.beds.filter((bed) => bed.id !== id) })) }
  }),
  addArtist: (artist) => change((data) => ({ ...data, artists: [...data.artists, { ...artist, id: uid() }] })),
  updateArtist: (id, artist) => change((data) => ({ ...data, artists: data.artists.map((item) => item.id === id ? { ...artist, id } : item) })),
  removeArtist: (id) => change((data) => {
    if (data.bookings.some((booking) => booking.artistId === id) || slots(data).some((slot) => slot.artistId === id)) fail(409, 'Non puoi eliminare un tatuatore usato in prenotazioni o consulenze.')
    return { ...data, artists: data.artists.filter((artist) => artist.id !== id) }
  }),
  saveBooking: (input) => change((data) => {
    if (!data.rooms.some((room) => room.beds.some((bed) => bed.id === input.bedId)) || !data.artists.some((artist) => artist.id === input.artistId)) fail(400, 'Lettino o tatuatore non valido.')
    const error = timeRangeError(input, data.hours) || bookingConflict(input, data.bookings.filter((booking) => booking.id !== input.id))
    if (error) fail(409, error)
    if (slots(data).some((slot) => slot.artistId === input.artistId && overlaps(slot, input))) fail(409, 'Il tatuatore ha una consulenza in questa fascia oraria.')
    return { ...data, bookings: data.bookings.some((booking) => booking.id === input.id) ? data.bookings.map((booking) => booking.id === input.id ? input : booking) : [...data.bookings, { ...input, id: uid() }] }
  }),
  removeBooking: (id) => change((data) => ({ ...data, bookings: data.bookings.filter((booking) => booking.id !== id) })),
}
