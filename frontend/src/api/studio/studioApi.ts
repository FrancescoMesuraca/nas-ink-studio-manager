import type { Artist, Booking, StudioData, StudioHours } from '../types'

/**
 * Gestionale dello studio: orari, stanze, lettini, tatuatori e prenotazioni.
 * Ogni operazione di modifica restituisce lo stato aggiornato completo del gestionale.
 */
export interface StudioApi {
  getData(): Promise<StudioData>
  /** Solo in modalità demo: ripristina i dati iniziali. */
  reset(): Promise<StudioData>
  setHours(hours: StudioHours): Promise<StudioData>
  addRoom(name: string): Promise<StudioData>
  renameRoom(id: string, name: string): Promise<StudioData>
  removeRoom(id: string): Promise<StudioData>
  addBed(roomId: string, name: string): Promise<StudioData>
  renameBed(id: string, name: string): Promise<StudioData>
  removeBed(id: string): Promise<StudioData>
  addArtist(artist: Omit<Artist, 'id'>): Promise<StudioData>
  updateArtist(id: string, artist: Omit<Artist, 'id'>): Promise<StudioData>
  removeArtist(id: string): Promise<StudioData>
  /** Crea la prenotazione se `id` è vuoto, altrimenti la aggiorna. */
  saveBooking(booking: Booking): Promise<StudioData>
  removeBooking(id: string): Promise<StudioData>
}
