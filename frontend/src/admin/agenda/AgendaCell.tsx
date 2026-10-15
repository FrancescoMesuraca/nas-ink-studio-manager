import type { Artist } from '../../api'
import { useAdmin } from '../adminContext'
import { freeTimes } from './freeTimes'

/** Giornata di un tatuatore nell'agenda: tatuaggi, consulenze e fasce ancora libere. */
export default function AgendaCell({ artist, day }: { artist: Artist; day: string }) {
  const { data, openRequest } = useAdmin()
  const bookings = data.bookings.filter((item) => item.artistId === artist.id && item.date === day)
  // Coppie richiesta + fascia: così più avanti la fascia è sicuramente definita.
  const consultations = data.requests.flatMap((request) => {
    const slot = request.consultationSlot
    return slot && slot.artistId === artist.id && slot.date === day ? [{ request, slot }] : []
  })
  const roomOf = (bedId: string) => data.rooms.find((room) => room.beds.some((bed) => bed.id === bedId))?.name
  const free = freeTimes(data.hours, [...bookings, ...consultations.map(({ slot }) => slot)])

  return <div className="calendar-cell">
    {bookings.map((item) => <div className="calendar-event" key={item.id} style={{ borderColor: artist.color }}>
      <b>{item.start}–{item.end}</b>
      <span>Tatuaggio · {roomOf(item.bedId)}</span>
    </div>)}
    {consultations.map(({ request, slot }) => <button className="calendar-event consultation-event" key={request.id} onClick={() => openRequest(request.id)}>
      <b>{slot.start}–{slot.end}</b>
      <span>Consulenza {slot.status} · {request.name}</span>
    </button>)}
    <small className="availability"><b>Libero:</b> {free.join(', ') || 'nessuna fascia'}</small>
  </div>
}
