// DTO condivisi tra pagine, mock e client HTTP.
// Sono il contratto con il backend: cambiarli vuol dire cambiare le API.

export type RequestStatus = 'nuova' | 'consulenza' | 'approvata' | 'chiusa'

export type Bed = { id: string; name: string }
export type Room = { id: string; name: string; beds: Bed[] }
export type Artist = { id: string; name: string; color: string }
export type Booking = { id: string; date: string; start: string; end: string; bedId: string; artistId: string }
export type Consultation = { notes: string; subject: string; composition: string; style: string; position: string; size: string; colors: string; imageUrl: string }
export type ConsultationSlot = { artistId: string; date: string; start: string; end: string; status: 'proposta' | 'confermata' }
export type CustomerRequest = { id: string; name: string; contact: string; description: string; bodyArea: string; size: string; style: string; references: string; status: RequestStatus; consultation: Consultation; consultationSlot?: ConsultationSlot }
export type StudioHours = { start: string; end: string }
export type StudioData = { hours: StudioHours; rooms: Room[]; artists: Artist[]; bookings: Booking[]; requests: CustomerRequest[] }

/** Dati per creare una richiesta (dal sito pubblico o dal gestionale). */
export type NewRequestInput = Omit<CustomerRequest, 'id' | 'status' | 'consultation' | 'consultationSlot'>

/** Errore restituito da tutte le API (mock e HTTP). `status` segue i codici HTTP; 0 = rete non raggiungibile. */
export class ApiError extends Error {
  readonly status: number
  readonly fields?: Record<string, string>

  constructor(status: number, message: string, fields?: Record<string, string>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fields = fields
  }
}

export const errorMessage = (error: unknown, fallback = 'Operazione non riuscita.') =>
  error instanceof Error && error.message ? error.message : fallback

// --- Autenticazione ---

/** `titolare`: accesso completo. `tatuatore`: agenda, lettini, richieste e schede; niente configurazione né sito. */
export type Role = 'titolare' | 'tatuatore'
export type User = { id: string; name: string; email: string; role: Role; artistId?: string }
export type Session = { token: string; user: User }
