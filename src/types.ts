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
