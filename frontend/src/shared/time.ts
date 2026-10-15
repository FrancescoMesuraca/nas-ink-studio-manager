// Utilità per date (AAAA-MM-GG) e orari (HH:MM) usate dal gestionale e dal sito.
import type { StudioHours } from '../api'

export const minutes = (time: string) => { const [h, m] = time.split(':').map(Number); return h * 60 + m }
export const timeText = (value: number) => String(Math.floor(value / 60)).padStart(2, '0') + ':' + String(value % 60).padStart(2, '0')
export const nextHour = (hours: StudioHours) => timeText(Math.min(minutes(hours.start) + 60, minutes(hours.end)))
export const dateText = (date: Date) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
export const addDays = (date: string, days: number) => { const value = new Date(date + 'T12:00:00'); value.setDate(value.getDate() + days); return dateText(value) }
export const firstDayOfWeek = (date: string) => { const day = new Date(date + 'T12:00:00').getDay(); return addDays(date, -(day === 0 ? 6 : day - 1)) }
export const formatDate = (date: string) => new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(date + 'T12:00:00'))
export const dateTimeText = (iso: string) => new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
