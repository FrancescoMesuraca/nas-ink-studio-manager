// DTO condivisi tra pagine, mock e client HTTP.
// Sono il contratto con il backend: cambiarli vuol dire cambiare le API.

export type RequestStatus = 'nuova' | 'consulenza' | 'approvata' | 'chiusa'

export type Bed = { id: string; name: string }
export type Room = { id: string; name: string; beds: Bed[] }
export type Artist = { id: string; name: string; color: string }
export type Booking = { id: string; date: string; start: string; end: string; bedId: string; artistId: string }
export type Consultation = { notes: string; subject: string; composition: string; style: string; position: string; size: string; colors: string; imageUrl: string }
export type ConsultationSlot = { artistId: string; date: string; start: string; end: string; status: 'proposta' | 'confermata' }
export type RequestSource = 'sito' | 'gestionale'
export type CustomerRequest = {
  id: string
  name: string
  /** Recapito in testo libero (sempre presente; per le richieste dal sito è "email · telefono"). */
  contact: string
  description: string
  bodyArea: string
  size: string
  style: string
  references: string
  status: RequestStatus
  consultation: Consultation
  consultationSlot?: ConsultationSlot
  // Campi aggiunti con il modulo pubblico. I dati salvati prima vengono migrati (source, referenceImages).
  email?: string
  phone?: string
  preferredArtistId?: string
  /** URL delle immagini di riferimento (data URL nel mock), al massimo 3. */
  referenceImages: string[]
  availability?: string
  source: RequestSource
  /** ISO 8601. Assente nelle richieste create prima dell'introduzione del campo. */
  createdAt?: string
  /** ISO 8601, momento in cui il cliente ha accettato l'informativa (richieste dal sito). */
  privacyConsentAt?: string
}
export type StudioHours = { start: string; end: string }
export type StudioData = { hours: StudioHours; rooms: Room[]; artists: Artist[]; bookings: Booking[]; requests: CustomerRequest[] }

/** Dati per creare una richiesta (dal sito pubblico o dal gestionale). */
export type NewRequestInput = Omit<CustomerRequest, 'id' | 'status' | 'consultation' | 'consultationSlot' | 'createdAt' | 'privacyConsentAt'> & {
  /** Obbligatorio (true) per le richieste dal sito. */
  privacyConsent?: boolean
}

/** Limiti condivisi da modulo pubblico e mock (il backend dovrà applicare gli stessi). */
export const requestLimits = { maxReferenceImages: 3, maxImageBytes: 700 * 1024 }

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

// --- Sito vetrina ---

export type SiteSectionId = 'about' | 'gallery' | 'artists' | 'contacts'
export type SiteTheme = { accent: string; background: 'dark' | 'light'; font: 'classic' | 'modern' | 'bold' }
export type GalleryItem = { id: string; imageUrl: string; caption?: string; artistId?: string }
/** Bio e foto facoltative dei tatuatori; nome e colore arrivano dal gestionale. */
export type ArtistProfile = { artistId: string; bio?: string; photoUrl?: string; instagram?: string }

/** Contenuti del sito personalizzabili dal titolare. Poche scelte guidate, non un page builder. */
export type SiteContent = {
  studioName: string
  logoUrl?: string
  theme: SiteTheme
  hero: { title: string; subtitle: string; imageUrl: string; ctaLabel: string }
  about: { title: string; text: string; imageUrl?: string }
  gallery: GalleryItem[]
  artistProfiles: ArtistProfile[]
  contacts: { address: string; phone: string; email: string; instagram?: string; mapUrl?: string }
  /** L'ordine dell'array è l'ordine in pagina; `visible: false` nasconde la sezione. */
  sections: { id: SiteSectionId; visible: boolean }[]
}

export type PublicArtist = { id: string; name: string; color: string; bio?: string; photoUrl?: string; instagram?: string }

/** Tutto ciò che serve alla parte pubblica, senza dati riservati del gestionale. */
export type PublicSite = { content: SiteContent; artists: PublicArtist[]; hours: StudioHours }
