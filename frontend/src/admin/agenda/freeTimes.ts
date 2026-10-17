import type { StudioHours } from '../../api'

/**
 * Fasce libere della giornata ("09:00–10:30") dato l'orario dello studio e gli impegni.
 * Gli impegni possono essere in qualsiasi ordine e anche sovrapporsi.
 */
export function freeTimes(hours: StudioHours, events: { start: string; end: string }[]) {
  let cursor = hours.start
  const free: string[] = []
  for (const event of [...events].sort((a, b) => a.start.localeCompare(b.start))) {
    if (event.start > cursor) free.push(cursor + '–' + event.start)
    if (event.end > cursor) cursor = event.end
  }
  if (cursor < hours.end) free.push(cursor + '–' + hours.end)
  return free
}
