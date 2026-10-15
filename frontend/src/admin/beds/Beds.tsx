import { useState } from 'react'
import type { Booking } from '../../api'
import { minutes, nextHour } from '../../shared/time'
import { useAdmin } from '../adminContext'
import BookingDialog from './BookingDialog'

export default function Beds() {
  const { data, date, setDate, run } = useAdmin()
  const [booking, setBooking] = useState<Booking | null>(null)
  const today = data.bookings.filter((item) => item.date === date)
  const artists = new Map(data.artists.map((artist) => [artist.id, artist]))
  const firstBed = data.rooms[0]?.beds[0]?.id ?? ''
  const firstArtist = data.artists[0]?.id ?? ''
  const start = minutes(data.hours.start), duration = minutes(data.hours.end) - start
  return <section>
    <div className="section-title"><div><h2>Occupazione lettini</h2><p>{data.hours.start}–{data.hours.end} · fasce e tatuatori</p></div><label>Data<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label><button disabled={!firstBed || !firstArtist} onClick={() => setBooking({ id: '', date, start: data.hours.start, end: nextHour(data.hours), bedId: firstBed, artistId: firstArtist })}>Nuova prenotazione</button></div>
    {!firstBed || !firstArtist ? <p className="empty">Configura almeno un lettino e un tatuatore per prenotare.</p> : <div className="schedule">
      <div className="time-axis"><span>{data.hours.start}</span><span>{data.hours.end}</span></div>
      {data.rooms.map((room) => <div className="room" key={room.id}><h3>{room.name}</h3>{room.beds.map((bed) => <div className="bed-row" key={bed.id}><b>{bed.name}</b><div className="timeline">{today.filter((item) => item.bedId === bed.id).map((item) => {
        const artist = artists.get(item.artistId)
        const left = (minutes(item.start) - start) / duration * 100
        const width = (minutes(item.end) - minutes(item.start)) / duration * 100
        return <button className="booking" key={item.id} title={item.start + '–' + item.end + ' · ' + (artist?.name ?? 'Tatuatore')} style={{ left: left + '%', width: width + '%', background: artist?.color }} onClick={() => setBooking(item)}><span>{item.start}–{item.end}</span><b>{artist?.name}</b></button>
      })}</div></div>)}</div>)}
    </div>}
    {booking && <BookingDialog data={data} booking={booking} close={() => setBooking(null)} run={run} />}
  </section>
}
