import { useState, type FormEvent } from 'react'
import { studioApi } from '../../api'
import { useAdmin } from '../adminContext'

export default function HoursCard() {
  const { data, run } = useAdmin()
  const [hours, setHours] = useState(data.hours)

  const save = (event: FormEvent) => {
    event.preventDefault()
    void run(() => studioApi.setHours(hours))
  }

  return <div className="card">
    <h2>Orari dello studio</h2>
    <form className="form" onSubmit={save}>
      <div className="two">
        <label>
          Apertura
          <input required type="time" value={hours.start} onChange={(e) => setHours({ ...hours, start: e.target.value })} />
        </label>
        <label>
          Chiusura
          <input required type="time" value={hours.end} onChange={(e) => setHours({ ...hours, end: e.target.value })} />
        </label>
      </div>
      <button>Salva orari</button>
    </form>
    <p className="hint">Le prenotazioni e le consulenze devono rientrare negli orari dello studio.</p>
  </div>
}
