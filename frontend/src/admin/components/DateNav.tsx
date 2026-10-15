import { addDays, dateText } from '../../shared/time'

const units = {
  day: { step: 1, label: 'Data', previous: 'Giorno precedente', next: 'Giorno successivo', current: 'Oggi' },
  week: { step: 7, label: 'Settimana del', previous: 'Settimana precedente', next: 'Settimana successiva', current: 'Questa settimana' },
}

/** Campo data con i pulsanti per spostarsi di un giorno o di una settimana e per tornare a oggi. */
export default function DateNav({ unit, date, onChange }: { unit: keyof typeof units; date: string; onChange: (date: string) => void }) {
  const { step, label, previous, next, current } = units[unit]
  const today = dateText(new Date())

  return <div className="date-nav">
    <button type="button" className="secondary" aria-label={previous} title={previous} onClick={() => onChange(addDays(date, -step))}>‹</button>
    <label>
      {label}
      {/* Il campo vuoto (cancellato a mano) non è una data: lo ignoriamo. */}
      <input type="date" value={date} onChange={(e) => { if (e.target.value) onChange(e.target.value) }} />
    </label>
    <button type="button" className="secondary" aria-label={next} title={next} onClick={() => onChange(addDays(date, step))}>›</button>
    <button type="button" className="secondary" disabled={date === today} onClick={() => onChange(today)}>{current}</button>
  </div>
}
