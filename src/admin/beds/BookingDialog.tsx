import { useState } from 'react'
import { studioApi, type Booking, type StudioData } from '../../api'
import type { Runner } from '../adminContext'

export default function BookingDialog({ data, booking, close, run }: { data: StudioData; booking: Booking; close: () => void; run: Runner }) {
  const [form, setForm] = useState(booking)
  const set = (field: keyof Booking, value: string) => setForm({ ...form, [field]: value })
  return <div className="modal"><form className="card form" onSubmit={(e) => { e.preventDefault(); void run(() => studioApi.saveBooking(form)).then((ok) => { if (ok) close() }) }}>
    <div className="modal-title"><h2>{booking.id ? 'Modifica prenotazione' : 'Nuova prenotazione'}</h2><button className="icon" type="button" aria-label="Chiudi" onClick={close}>×</button></div>
    <label>Data<input required type="date" value={form.date} onChange={(e) => set('date', e.target.value)} /></label>
    <div className="two"><label>Inizio<input required type="time" min={data.hours.start} max={data.hours.end} value={form.start} onChange={(e) => set('start', e.target.value)} /></label><label>Fine<input required type="time" min={data.hours.start} max={data.hours.end} value={form.end} onChange={(e) => set('end', e.target.value)} /></label></div>
    <p className="hint">Orari dello studio: {data.hours.start}–{data.hours.end}</p>
    <label>Lettino<select value={form.bedId} onChange={(e) => set('bedId', e.target.value)}>{data.rooms.map((room) => <optgroup key={room.id} label={room.name}>{room.beds.map((bed) => <option key={bed.id} value={bed.id}>{bed.name}</option>)}</optgroup>)}</select></label>
    <label>Tatuatore<select value={form.artistId} onChange={(e) => set('artistId', e.target.value)}>{data.artists.map((artist) => <option key={artist.id} value={artist.id}>{artist.name}</option>)}</select></label>
    <div className="actions"><button>Salva</button>{booking.id && <button type="button" className="danger" onClick={() => void run(() => studioApi.removeBooking(booking.id)).then((ok) => { if (ok) close() })}>Elimina</button>}</div>
  </form></div>
}
