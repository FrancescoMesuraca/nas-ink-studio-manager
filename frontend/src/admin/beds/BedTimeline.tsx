import type { Booking } from '../../api'
import { minutes } from '../../shared/time'
import { useAdmin } from '../adminContext'

/**
 * Fascia oraria di un lettino, dall'apertura alla chiusura dello studio.
 * Ogni prenotazione è un blocco posizionato in percentuale rispetto all'orario.
 */
export default function BedTimeline({ bookings, onOpen }: { bookings: Booking[]; onOpen: (booking: Booking) => void }) {
  const { data } = useAdmin()
  const opening = minutes(data.hours.start)
  const length = minutes(data.hours.end) - opening
  const percent = (time: string) => (minutes(time) - opening) / length * 100

  return <div className="timeline">
    {bookings.map((item) => {
      const artist = data.artists.find((candidate) => candidate.id === item.artistId)
      return <button
        key={item.id}
        className="booking"
        title={item.start + '–' + item.end + ' · ' + (artist?.name ?? 'Tatuatore')}
        style={{ left: percent(item.start) + '%', width: percent(item.end) - percent(item.start) + '%', background: artist?.color }}
        onClick={() => onOpen(item)}
      >
        <span>{item.start}–{item.end}</span>
        <b>{artist?.name}</b>
      </button>
    })}
  </div>
}
