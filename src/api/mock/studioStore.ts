// Archivio del gestionale nel mock, condiviso da studioApi e requestsApi
// (una richiesta inviata dal sito deve comparire subito tra le richieste del gestionale).
import seed from './seed/studio.json'
import { overlaps } from '../../services/bookingRules.js'
import type { ConsultationSlot, CustomerRequest, StudioData } from '../types'
import { clone, readJson, writeJson } from './storage'

export const studioKey = 'nas-ink-studio-data'

export const seedStudio = () => clone(seed as StudioData)

/** Richiesta salvata da una versione precedente, senza i campi introdotti dal modulo pubblico. */
type StoredRequest = Omit<CustomerRequest, 'source' | 'referenceImages'> & Partial<Pick<CustomerRequest, 'source' | 'referenceImages'>>

/** Porta una richiesta salvata al formato attuale: prima del sito tutte nascevano dal gestionale. */
export const migrateRequest = (request: StoredRequest): CustomerRequest =>
  ({ ...request, source: request.source ?? 'gestionale', referenceImages: request.referenceImages ?? [] })

export function loadStudio(): StudioData {
  const parsed = readJson<Omit<StudioData, 'requests'> & { requests?: StoredRequest[] }>(studioKey)
  if (!parsed) return seedStudio()
  return { ...parsed, hours: parsed.hours ?? seed.hours, requests: (parsed.requests ?? []).map(migrateRequest) }
}

export function saveStudio(next: StudioData) {
  writeJson(studioKey, next)
  return clone(next)
}

export const hasBookings = (data: StudioData, bedIds: string[]) => data.bookings.some((booking) => bedIds.includes(booking.bedId))

export const slots = (data: StudioData, exceptRequestId?: string) =>
  data.requests.filter((request) => request.id !== exceptRequestId).flatMap((request) => request.consultationSlot ? [request.consultationSlot] : [])

export const artistBusy = (data: StudioData, slot: ConsultationSlot, exceptRequestId?: string) =>
  data.bookings.some((booking) => booking.artistId === slot.artistId && overlaps(slot, booking)) ||
  slots(data, exceptRequestId).some((other) => other.artistId === slot.artistId && overlaps(slot, other))
