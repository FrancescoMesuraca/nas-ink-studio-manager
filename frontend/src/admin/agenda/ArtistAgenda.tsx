import { addDays, dateText, firstDayOfWeek, formatDate } from '../../shared/time'
import { ArtistDot } from '../../shared/ui'
import { useAdmin } from '../adminContext'
import DateNav from '../components/DateNav'
import AgendaCell from './AgendaCell'

/** Settimana dei tatuatori (da lunedì a domenica): una riga per tatuatore, una colonna per giorno. */
export default function ArtistAgenda() {
  const { data, date, setDate } = useAdmin()
  const monday = firstDayOfWeek(date)
  const days = Array.from({ length: 7 }, (_, index) => addDays(monday, index))
  const today = dateText(new Date())

  return <section>
    <div className="section-title">
      <div>
        <h2>Agenda tatuatori</h2>
        <p>Disponibilità tra {data.hours.start} e {data.hours.end}. Le proposte occupano provvisoriamente la fascia.</p>
      </div>
      <DateNav unit="week" date={date} onChange={setDate} />
    </div>
    <div className="calendar-scroll">
      <div className="calendar">
        <div className="calendar-head">Tatuatore</div>
        {days.map((day) => <div className={'calendar-head' + (day === today ? ' today' : '')} key={day}>{formatDate(day)}</div>)}
        {data.artists.map((artist) => <div className="calendar-row" key={artist.id}>
          <div className="calendar-artist"><ArtistDot color={artist.color} />{artist.name}</div>
          {days.map((day) => <AgendaCell key={day} artist={artist} day={day} />)}
        </div>)}
      </div>
    </div>
  </section>
}
