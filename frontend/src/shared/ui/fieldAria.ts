/**
 * Attributi ARIA per il controllo dentro un `Field`: lo segna come non valido
 * e lo collega al suggerimento (`hintId`) e all'eventuale errore.
 */
export function fieldAria(id: string, error?: string, hintId?: string) {
  const describedBy = [hintId, error ? id + '-error' : undefined].filter(Boolean).join(' ')
  return { 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy || undefined }
}
