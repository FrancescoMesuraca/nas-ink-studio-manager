import initialData from '../data/studio.json'
import { bookingConflict, overlaps, timeRangeError } from './bookingRules.js'
import type { Artist, Booking, Consultation, ConsultationSlot, CustomerRequest, RequestStatus, StudioData, StudioHours } from '../types'

const key = 'nas-ink-studio-data'
const clone = <T,>(value: T): T => structuredClone(value)
const uid = () => crypto.randomUUID()

function load(): StudioData {
  const saved = localStorage.getItem(key)
  if (!saved) return clone(initialData as StudioData)
  try {
    const parsed = JSON.parse(saved) as StudioData
    return { ...parsed, hours: parsed.hours ?? initialData.hours }
  } catch { return clone(initialData as StudioData) }
}

let data = load()
const save = () => localStorage.setItem(key, JSON.stringify(data))
const update = (next: StudioData) => { data = next; save(); return clone(data) }
const hasBookings = (bedIds: string[]) => data.bookings.some((booking) => bedIds.includes(booking.bedId))
const slots = (exceptRequestId?: string) => data.requests.filter((request) => request.id !== exceptRequestId).flatMap((request) => request.consultationSlot ? [request.consultationSlot] : [])
const artistBusy = (slot: ConsultationSlot, exceptRequestId?: string) =>
  data.bookings.some((booking) => booking.artistId === slot.artistId && overlaps(slot, booking)) ||
  slots(exceptRequestId).some((other) => other.artistId === slot.artistId && overlaps(slot, other))

export const studioService = {
  async getData() { return clone(data) },
  async reset() { data = clone(initialData as StudioData); save(); return clone(data) },
  async setHours(hours: StudioHours) {
    if (hours.end <= hours.start) throw new Error('La chiusura deve essere successiva all’apertura.')
    if ([...data.bookings, ...slots()].some((item) => timeRangeError(item, hours))) throw new Error('Alcuni appuntamenti esistenti sono fuori dai nuovi orari dello studio.')
    return update({ ...data, hours })
  },
  async addRoom(name: string) { return update({ ...data, rooms: [...data.rooms, { id: uid(), name, beds: [] }] }) },
  async renameRoom(id: string, name: string) { return update({ ...data, rooms: data.rooms.map((room) => room.id === id ? { ...room, name } : room) }) },
  async removeRoom(id: string) {
    const room = data.rooms.find((item) => item.id === id)
    if (!room) throw new Error('Stanza non trovata.')
    if (hasBookings(room.beds.map((bed) => bed.id))) throw new Error('Non puoi eliminare una stanza con lettini usati nelle prenotazioni.')
    return update({ ...data, rooms: data.rooms.filter((item) => item.id !== id) })
  },
  async addBed(roomId: string, name: string) { return update({ ...data, rooms: data.rooms.map((room) => room.id === roomId ? { ...room, beds: [...room.beds, { id: uid(), name }] } : room) }) },
  async renameBed(id: string, name: string) { return update({ ...data, rooms: data.rooms.map((room) => ({ ...room, beds: room.beds.map((bed) => bed.id === id ? { ...bed, name } : bed) })) }) },
  async removeBed(id: string) {
    if (hasBookings([id])) throw new Error('Non puoi eliminare un lettino usato nelle prenotazioni.')
    return update({ ...data, rooms: data.rooms.map((room) => ({ ...room, beds: room.beds.filter((bed) => bed.id !== id) })) })
  },
  async addArtist(artist: Omit<Artist, 'id'>) { return update({ ...data, artists: [...data.artists, { ...artist, id: uid() }] }) },
  async updateArtist(id: string, artist: Omit<Artist, 'id'>) { return update({ ...data, artists: data.artists.map((item) => item.id === id ? { ...artist, id } : item) }) },
  async removeArtist(id: string) {
    if (data.bookings.some((booking) => booking.artistId === id) || slots().some((slot) => slot.artistId === id)) throw new Error('Non puoi eliminare un tatuatore usato in prenotazioni o consulenze.')
    return update({ ...data, artists: data.artists.filter((artist) => artist.id !== id) })
  },
  async saveBooking(input: Booking) {
    if (!data.rooms.some((room) => room.beds.some((bed) => bed.id === input.bedId)) || !data.artists.some((artist) => artist.id === input.artistId)) throw new Error('Lettino o tatuatore non valido.')
    const error = timeRangeError(input, data.hours) || bookingConflict(input, data.bookings.filter((booking) => booking.id !== input.id))
    if (error) throw new Error(error)
    if (slots().some((slot) => slot.artistId === input.artistId && overlaps(slot, input))) throw new Error('Il tatuatore ha una consulenza in questa fascia oraria.')
    return update({ ...data, bookings: data.bookings.some((booking) => booking.id === input.id) ? data.bookings.map((booking) => booking.id === input.id ? input : booking) : [...data.bookings, { ...input, id: uid() }] })
  },
  async removeBooking(id: string) { return update({ ...data, bookings: data.bookings.filter((booking) => booking.id !== id) }) },
  async addRequest(input: Omit<CustomerRequest, 'id' | 'status' | 'consultation'>) { return update({ ...data, requests: [...data.requests, { ...input, id: uid(), status: 'nuova', consultation: { notes: '', subject: '', composition: '', style: '', position: '', size: '', colors: '', imageUrl: '' } }] }) },
  async updateRequest(id: string, fields: Partial<Pick<CustomerRequest, 'status' | 'consultation'>>) { return update({ ...data, requests: data.requests.map((request) => request.id === id ? { ...request, ...fields } : request) }) },
  async setRequestStatus(id: string, status: RequestStatus) { return this.updateRequest(id, { status }) },
  async saveConsultation(id: string, consultation: Consultation) { return this.updateRequest(id, { consultation }) },
  async proposeConsultation(id: string, slot: Omit<ConsultationSlot, 'status'>) {
    const request = data.requests.find((item) => item.id === id)
    if (!request) throw new Error('Scheda cliente non trovata.')
    if (!data.artists.some((artist) => artist.id === slot.artistId)) throw new Error('Tatuatore non valido.')
    const error = timeRangeError(slot, data.hours)
    if (error) throw new Error(error)
    if (artistBusy({ ...slot, status: 'proposta' }, id)) throw new Error('Il tatuatore è occupato in questa fascia oraria.')
    return update({ ...data, requests: data.requests.map((item) => item.id === id ? { ...item, consultationSlot: { ...slot, status: 'proposta' } } : item) })
  },
  async confirmConsultation(id: string) {
    const request = data.requests.find((item) => item.id === id)
    const slot = request?.consultationSlot
    if (!slot || slot.status !== 'proposta') throw new Error('Non c’è una proposta da confermare.')
    if (artistBusy(slot, id)) throw new Error('Il tatuatore è occupato in questa fascia oraria.')
    return update({ ...data, requests: data.requests.map((item) => item.id === id ? { ...item, status: 'consulenza' as const, consultationSlot: { ...slot, status: 'confermata' as const } } : item) })
  },
  async cancelConsultation(id: string) {
    return update({ ...data, requests: data.requests.map((item) => item.id === id ? { ...item, consultationSlot: undefined } : item) })
  },
}
