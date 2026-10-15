import type { StudioHours } from '../../api'
import { addDays, firstDayOfWeek, formatDate } from '../../shared/time'
import { useAdmin } from '../adminContext'

function freeTimes(hours: StudioHours, events: { start: string; end: string }[]) {
  let cursor = hours.start
  const free: string[] = []
  for (const event of [...events].sort((a, b) => a.start.localeCompare(b.start))) {
    if (event.start > cursor) free.push(cursor + '–' + event.start)
    if (event.end > cursor) cursor = event.end
  }
  if (cursor < hours.end) free.push(cursor + '–' + hours.end)
  return free
}

export default function ArtistAgenda() {
  const { data, date, setDate, openRequest } = useAdmin()
  const monday = firstDayOfWeek(date)
  const days = Array.from({ length: 7 }, (_, index) => addDays(monday, index))
  return <section><div className="section-title"><div><h2>Agenda tatuatori</h2><p>Disponibilità tra {data.hours.start} e {data.hours.end}. Le proposte occupano provvisoriamente la fascia.</p></div><label>Settimana del<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label></div>
    <div className="calendar-scroll"><div className="calendar"><div className="calendar-head">Tatuatore</div>{days.map((day) => <div className="calendar-head" key={day}>{formatDate(day)}</div>)}
      {data.artists.map((artist) => <div className="calendar-row" key={artist.id}><div className="calendar-artist"><i style={{ background: artist.color }} />{artist.name}</div>{days.map((day) => {
        const bookings = data.bookings.filter((item) => item.artistId === artist.id && item.date === day)
        const consultations = data.requests.filter((item) => item.consultationSlot?.artistId === artist.id && item.consultationSlot.date === day)
        const busy = [...bookings, ...consultations.map((item) => item.consultationSlot!)]
        return <div className="calendar-cell" key={day}>
          {bookings.map((item) => <div className="calendar-event" key={item.id} style={{ borderColor: artist.color }}><b>{item.start}–{item.end}</b><span>Tatuaggio · {data.rooms.flatMap((room) => room.beds.map((bed) => ({ room: room.name, bed }))).find((place) => place.bed.id === item.bedId)?.room}</span></div>)}
          {consultations.map((item) => <button className="calendar-event consultation-event" key={item.id} onClick={() => openRequest(item.id)}><b>{item.consultationSlot?.start}–{item.consultationSlot?.end}</b><span>Consulenza {item.consultationSlot?.status} · {item.name}</span></button>)}
          <small className="availability"><b>Libero:</b> {freeTimes(data.hours, busy).join(', ') || 'nessuna fascia'}</small>
        </div>
      })}</div>)}
    </div></div>
  </section>
}
