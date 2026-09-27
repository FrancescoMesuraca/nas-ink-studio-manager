export function timeRangeError(candidate, hours) {
  if (!candidate.date || !candidate.start || !candidate.end || candidate.end <= candidate.start) return 'L’orario di fine deve essere successivo a quello di inizio.'
  if (candidate.start < hours.start || candidate.end > hours.end) return `Scegli un orario tra ${hours.start} e ${hours.end}.`
  return null
}

export function overlaps(a, b) {
  return a.date === b.date && a.start < b.end && b.start < a.end
}

export function bookingConflict(candidate, bookings) {
  if (candidate.end <= candidate.start) return 'L’orario di fine deve essere successivo a quello di inizio.'
  if (bookings.some((booking) => booking.bedId === candidate.bedId && overlaps(candidate, booking))) return 'Il lettino è già occupato in questa fascia oraria.'
  if (bookings.some((booking) => booking.artistId === candidate.artistId && overlaps(candidate, booking))) return 'Il tatuatore ha già una prenotazione in questa fascia oraria.'
  return null
}
