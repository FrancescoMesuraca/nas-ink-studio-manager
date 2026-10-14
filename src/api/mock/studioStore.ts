// Archivio del gestionale nel mock, condiviso da studioApi e requestsApi
// (una richiesta inviata dal sito deve comparire subito tra le richieste del gestionale).
import seed from './seed/studio.json'
import { overlaps } from '../../services/bookingRules.js'
import type { ConsultationSlot, StudioData } from '../types'
import { clone, readJson, writeJson } from './storage'

export const studioKey = 'nas-ink-studio-data'

export const seedStudio = () => clone(seed as StudioData)

export function loadStudio(): StudioData {
  const parsed = readJson<StudioData>(studioKey)
  if (!parsed) return seedStudio()
  return { ...parsed, hours: parsed.hours ?? seed.hours }
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
