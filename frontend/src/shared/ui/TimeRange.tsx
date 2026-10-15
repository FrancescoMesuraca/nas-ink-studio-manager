import type { StudioHours } from '../../api'

type Range = { start: string; end: string }

/**
 * Campi "Inizio" e "Fine" limitati agli orari dello studio.
 * Restituisce due etichette affiancate: va messo in un contenitore a griglia (`.two`, `.three`).
 */
export default function TimeRange({ start, end, hours, onChange }: Range & { hours: StudioHours; onChange: (range: Range) => void }) {
  return <>
    <label>Inizio<input required type="time" min={hours.start} max={hours.end} value={start} onChange={(e) => onChange({ start: e.target.value, end })} /></label>
    <label>Fine<input required type="time" min={hours.start} max={hours.end} value={end} onChange={(e) => onChange({ start, end: e.target.value })} /></label>
  </>
}
