import { useState } from 'react'
import type { Booking } from '../../api'
import { formatDate, nextHour } from '../../shared/time'
import { useAdmin } from '../adminContext'
import DateNav from '../components/DateNav'
import BedTimeline from './BedTimeline'
import BookingDialog from './BookingDialog'

/** Occupazione dei lettini in un giorno: una riga per lettino, raggruppati per stanza. */
export default function Beds() {
  const { data, date, setDate } = useAdmin()
  const [booking, setBooking] = useState<Booking | null>(null)
  const dayBookings = data.bookings.filter((item) => item.date === date)
  const firstBed = data.rooms[0]?.beds[0]?.id
  const firstArtist = data.artists[0]?.id

  const newBooking = () => {
    if (firstBed && firstArtist) setBooking({ id: '', date, start: data.hours.start, end: nextHour(data.hours), bedId: firstBed, artistId: firstArtist })
  }

  return <section>
    <div className="section-title">
      <div>
        <h2>Occupazione lettini</h2>
        <p>{formatDate(date)} · {data.hours.start}–{data.hours.end}</p>
      </div>
      <DateNav unit="day" date={date} onChange={setDate} />
      <button disabled={!firstBed || !firstArtist} onClick={newBooking}>Nuova prenotazione</button>
    </div>
    {firstBed && firstArtist ? <div className="schedule">
      <div className="time-axis"><span>{data.hours.start}</span><span>{data.hours.end}</span></div>
      {data.rooms.map((room) => <div className="room" key={room.id}>
        <h3>{room.name}</h3>
        {room.beds.map((bed) => <div className="bed-row" key={bed.id}>
          <b>{bed.name}</b>
          <BedTimeline bookings={dayBookings.filter((item) => item.bedId === bed.id)} onOpen={setBooking} />
        </div>)}
      </div>)}
    </div> : <p className="empty">Configura almeno un lettino e un tatuatore per prenotare.</p>}
    {booking && <BookingDialog booking={booking} close={() => setBooking(null)} />}
  </section>
}
