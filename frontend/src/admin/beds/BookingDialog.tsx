import { useState, type FormEvent } from 'react'
import { studioApi, type Booking } from '../../api'
import { ArtistSelect, TimeRange } from '../../shared/ui'
import { useAdmin } from '../adminContext'

/** Finestra per creare (id vuoto) o modificare una prenotazione. */
export default function BookingDialog({ booking, close }: { booking: Booking; close: () => void }) {
  const { data, run } = useAdmin()
  const [form, setForm] = useState(booking)
  const set = (field: keyof Booking, value: string) => setForm({ ...form, [field]: value })

  // `run` restituisce true se l'operazione è riuscita: solo allora chiudiamo.
  const save = (event: FormEvent) => {
    event.preventDefault()
    void run(() => studioApi.saveBooking(form)).then((ok) => { if (ok) close() })
  }
  const remove = () => void run(() => studioApi.removeBooking(booking.id)).then((ok) => { if (ok) close() })

  return <div className="modal">
    <form className="card form" onSubmit={save}>
      <div className="modal-title">
        <h2>{booking.id ? 'Modifica prenotazione' : 'Nuova prenotazione'}</h2>
        <button className="icon" type="button" aria-label="Chiudi" onClick={close}>×</button>
      </div>
      <label>
        Data
        <input required type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
      </label>
      <div className="two">
        <TimeRange start={form.start} end={form.end} hours={data.hours} onChange={(range) => setForm({ ...form, ...range })} />
      </div>
      <p className="hint">Orari dello studio: {data.hours.start}–{data.hours.end}</p>
      <label>
        Lettino
        <select value={form.bedId} onChange={(e) => set('bedId', e.target.value)}>
          {data.rooms.map((room) => <optgroup key={room.id} label={room.name}>
            {room.beds.map((bed) => <option key={bed.id} value={bed.id}>{bed.name}</option>)}
          </optgroup>)}
        </select>
      </label>
      <label>
        Tatuatore
        <ArtistSelect artists={data.artists} value={form.artistId} onChange={(artistId) => set('artistId', artistId)} />
      </label>
      <div className="actions">
        <button>Salva</button>
        {booking.id && <button type="button" className="danger" onClick={remove}>Elimina</button>}
      </div>
    </form>
  </div>
}
