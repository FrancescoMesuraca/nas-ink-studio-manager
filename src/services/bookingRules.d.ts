import type { Booking, StudioHours } from '../types'

export function bookingConflict(candidate: Omit<Booking, 'id'>, bookings: Booking[]): string | null
export function timeRangeError(candidate: { date: string; start: string; end: string }, hours: StudioHours): string | null
export function overlaps(a: { date: string; start: string; end: string }, b: { date: string; start: string; end: string }): boolean
