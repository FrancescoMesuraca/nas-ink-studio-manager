import { useEffect, useState, type FormEvent } from 'react'
import './App.css'
import { studioService } from './services/studioService'
import type { Booking, Consultation, ConsultationSlot, CustomerRequest, StudioData, StudioHours } from './types'

const empty: StudioData = { hours: { start: '09:00', end: '23:00' }, rooms: [], artists: [], bookings: [], requests: [] }
const defaultRequest = { name: '', contact: '', description: '', bodyArea: '', size: '', style: '', references: '' }
const minutes = (time: string) => { const [h, m] = time.split(':').map(Number); return h * 60 + m }
const timeText = (value: number) => String(Math.floor(value / 60)).padStart(2, '0') + ':' + String(value % 60).padStart(2, '0')
const nextHour = (hours: StudioHours) => timeText(Math.min(minutes(hours.start) + 60, minutes(hours.end)))
const dateText = (date: Date) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
const addDays = (date: string, days: number) => { const value = new Date(date + 'T12:00:00'); value.setDate(value.getDate() + days); return dateText(value) }
const firstDayOfWeek = (date: string) => { const day = new Date(date + 'T12:00:00').getDay(); return addDays(date, -(day === 0 ? 6 : day - 1)) }
const formatDate = (date: string) => new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(date + 'T12:00:00'))
type Runner = (task: () => Promise<StudioData>) => Promise<boolean>
type Tab = 'beds' | 'agenda' | 'requests' | 'history' | 'settings'

function App() {
  const [data, setData] = useState<StudioData>(empty)
  const [tab, setTab] = useState<Tab>('beds')
  const [date, setDate] = useState(dateText(new Date()))
  const [error, setError] = useState('')
  const [booking, setBooking] = useState<Booking | null>(null)
  const [request, setRequest] = useState(defaultRequest)
  const [selected, setSelected] = useState<string | null>(null)
  useEffect(() => { void studioService.getData().then(setData) }, [])
  const run: Runner = async (task) => {
    try { setError(''); setData(await task()); return true }
    catch (e) { setError(e instanceof Error ? e.message : 'Operazione non riuscita.'); return false }
  }
  const createRequest = (event: FormEvent) => {
    event.preventDefault()
    if ([request.name, request.contact, request.description, request.bodyArea, request.size, request.style].some((value) => !value.trim())) {
      setError('Compila tutti i campi richiesti, incluso un contatto.')
      return
    }
    void run(() => studioService.addRequest(request)).then((ok) => { if (ok) setRequest(defaultRequest) })
  }
  const openRequest = (id: string) => { setSelected(id); setTab('requests') }
  return <main className="app">
    <header><div><p className="eyebrow">NAS INK</p><h1>Studio manager</h1></div><button className="secondary" onClick={() => void run(() => studioService.reset())}>Ripristina dati demo</button></header>
    <nav aria-label="Sezioni">{([
      ['beds', 'Lettini'], ['agenda', 'Agenda'], ['requests', 'Richieste'], ['history', 'Schede clienti'], ['settings', 'Configurazione']
    ] as [Tab, string][]).map(([id, label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}</nav>
    {error && <p className="error" role="alert">{error}<button aria-label="Chiudi errore" onClick={() => setError('')}>×</button></p>}
    {tab === 'beds' && <Beds data={data} date={date} setDate={setDate} booking={booking} setBooking={setBooking} run={run} />}
    {tab === 'agenda' && <ArtistAgenda data={data} date={date} setDate={setDate} openRequest={openRequest} />}
    {tab === 'requests' && <Requests data={data} request={request} setRequest={setRequest} create={createRequest} selected={data.requests.find((item) => item.id === selected) ?? null} setSelected={setSelected} run={run} />}
    {tab === 'history' && <History data={data} openRequest={openRequest} />}
    {tab === 'settings' && <Settings data={data} run={run} />}
  </main>
}

function Beds({ data, date, setDate, booking, setBooking, run }: { data: StudioData; date: string; setDate: (v: string) => void; booking: Booking | null; setBooking: (v: Booking | null) => void; run: Runner }) {
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

function BookingDialog({ data, booking, close, run }: { data: StudioData; booking: Booking; close: () => void; run: Runner }) {
  const [form, setForm] = useState(booking)
  const set = (field: keyof Booking, value: string) => setForm({ ...form, [field]: value })
  return <div className="modal"><form className="card form" onSubmit={(e) => { e.preventDefault(); void run(() => studioService.saveBooking(form)).then((ok) => { if (ok) close() }) }}>
    <div className="modal-title"><h2>{booking.id ? 'Modifica prenotazione' : 'Nuova prenotazione'}</h2><button className="icon" type="button" aria-label="Chiudi" onClick={close}>×</button></div>
    <label>Data<input required type="date" value={form.date} onChange={(e) => set('date', e.target.value)} /></label>
    <div className="two"><label>Inizio<input required type="time" min={data.hours.start} max={data.hours.end} value={form.start} onChange={(e) => set('start', e.target.value)} /></label><label>Fine<input required type="time" min={data.hours.start} max={data.hours.end} value={form.end} onChange={(e) => set('end', e.target.value)} /></label></div>
    <p className="hint">Orari dello studio: {data.hours.start}–{data.hours.end}</p>
    <label>Lettino<select value={form.bedId} onChange={(e) => set('bedId', e.target.value)}>{data.rooms.map((room) => <optgroup key={room.id} label={room.name}>{room.beds.map((bed) => <option key={bed.id} value={bed.id}>{bed.name}</option>)}</optgroup>)}</select></label>
    <label>Tatuatore<select value={form.artistId} onChange={(e) => set('artistId', e.target.value)}>{data.artists.map((artist) => <option key={artist.id} value={artist.id}>{artist.name}</option>)}</select></label>
    <div className="actions"><button>Salva</button>{booking.id && <button type="button" className="danger" onClick={() => void run(() => studioService.removeBooking(booking.id)).then((ok) => { if (ok) close() })}>Elimina</button>}</div>
  </form></div>
}

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

function ArtistAgenda({ data, date, setDate, openRequest }: { data: StudioData; date: string; setDate: (v: string) => void; openRequest: (id: string) => void }) {
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

function Requests({ data, request, setRequest, create, selected, setSelected, run }: { data: StudioData; request: typeof defaultRequest; setRequest: (r: typeof defaultRequest) => void; create: (e: FormEvent) => void; selected: CustomerRequest | null; setSelected: (id: string) => void; run: Runner }) {
  const field = (key: keyof typeof defaultRequest, value: string) => setRequest({ ...request, [key]: value })
  return <section className="requests"><div><h2>Nuova richiesta</h2><form className="card form" onSubmit={create}>
    <label>Nome<input value={request.name} onChange={(e) => field('name', e.target.value)} /></label><label>Contatto<input placeholder="Email o telefono" value={request.contact} onChange={(e) => field('contact', e.target.value)} /></label><label>Idea<textarea value={request.description} onChange={(e) => field('description', e.target.value)} /></label><div className="two"><label>Zona<input value={request.bodyArea} onChange={(e) => field('bodyArea', e.target.value)} /></label><label>Dimensioni<input value={request.size} onChange={(e) => field('size', e.target.value)} /></label></div><label>Stile<input value={request.style} onChange={(e) => field('style', e.target.value)} /></label><label>Riferimenti (facoltativi)<input value={request.references} onChange={(e) => field('references', e.target.value)} /></label><button>Salva richiesta</button>
  </form></div><div><h2>Richieste</h2><div className="request-list">{data.requests.map((item) => <button className={selected?.id === item.id ? 'request selected' : 'request'} key={item.id} onClick={() => setSelected(item.id)}><span className={'status ' + item.status}>{item.status}</span><b>{item.name}</b><small>{item.style} · {item.bodyArea}</small></button>)}</div>{selected && <RequestDetail key={selected.id} request={selected} data={data} run={run} />}</div></section>
}

function RequestDetail({ request, data, run }: { request: CustomerRequest; data: StudioData; run: Runner }) {
  const [form, setForm] = useState(request.consultation)
  const [slot, setSlot] = useState<Omit<ConsultationSlot, 'status'>>({ artistId: request.consultationSlot?.artistId ?? data.artists[0]?.id ?? '', date: request.consultationSlot?.date ?? dateText(new Date()), start: request.consultationSlot?.start ?? data.hours.start, end: request.consultationSlot?.end ?? nextHour(data.hours) })
  const set = (key: keyof Consultation, value: string) => setForm({ ...form, [key]: value })
  return <article className="card detail"><h2>{request.name}</h2><p>{request.contact}</p><p><b>Idea:</b> {request.description}</p><p>{request.bodyArea} · {request.size} · {request.style}</p>
    <label>Stato<select value={request.status} onChange={(e) => void run(() => studioService.setRequestStatus(request.id, e.target.value as CustomerRequest['status']))}>{['nuova', 'consulenza', 'approvata', 'chiusa'].map((status) => <option key={status}>{status}</option>)}</select></label>
    <hr /><h3>Consulenza in studio</h3><p className="hint">Il tatuatore propone una fascia. La conferma del cliente è simulata qui; non viene inviata alcuna comunicazione.</p>
    {request.consultationSlot && <p className="slot-summary"><b>{request.consultationSlot.status === 'confermata' ? 'Appuntamento confermato' : 'Proposta in attesa'}</b> · {formatDate(request.consultationSlot.date)} {request.consultationSlot.start}–{request.consultationSlot.end} · {data.artists.find((artist) => artist.id === request.consultationSlot?.artistId)?.name}</p>}
    <form className="form" onSubmit={(e) => { e.preventDefault(); void run(() => studioService.proposeConsultation(request.id, slot)) }}>
      <label>Tatuatore<select required value={slot.artistId} onChange={(e) => setSlot({ ...slot, artistId: e.target.value })}>{data.artists.map((artist) => <option key={artist.id} value={artist.id}>{artist.name}</option>)}</select></label>
      <div className="three"><label>Data proposta<input required type="date" value={slot.date} onChange={(e) => setSlot({ ...slot, date: e.target.value })} /></label><label>Inizio<input required type="time" min={data.hours.start} max={data.hours.end} value={slot.start} onChange={(e) => setSlot({ ...slot, start: e.target.value })} /></label><label>Fine<input required type="time" min={data.hours.start} max={data.hours.end} value={slot.end} onChange={(e) => setSlot({ ...slot, end: e.target.value })} /></label></div>
      <div className="actions"><button disabled={!data.artists.length}>Proponi data</button>{request.consultationSlot?.status === 'proposta' && <button type="button" className="secondary" onClick={() => void run(() => studioService.confirmConsultation(request.id))}>Conferma cliente (demo)</button>}{request.consultationSlot && <button type="button" className="secondary" onClick={() => void run(() => studioService.cancelConsultation(request.id))}>Annulla fascia</button>}</div>
    </form>
    <hr /><h3>Bozza del progetto</h3><p className="hint">Bozza concettuale per discuterne insieme, non un disegno definitivo.</p><form className="form" onSubmit={(e) => { e.preventDefault(); void run(() => studioService.saveConsultation(request.id, form)) }}><label>Note<textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} /></label>{(['subject', 'composition', 'style', 'position', 'size', 'colors'] as const).map((key) => <label key={key}>{({ subject: 'Soggetto', composition: 'Composizione', style: 'Stile', position: 'Posizione', size: 'Dimensioni', colors: 'Colori' })[key]}<input value={form[key]} onChange={(e) => set(key, e.target.value)} /></label>)}<label>URL immagine di riferimento o bozza<input type="url" value={form.imageUrl} onChange={(e) => set('imageUrl', e.target.value)} /></label>{form.imageUrl && <img className="preview" src={form.imageUrl} alt="Anteprima bozza o riferimento" />}<button>Salva scheda</button></form>
  </article>
}

function History({ data, openRequest }: { data: StudioData; openRequest: (id: string) => void }) {
  const [filter, setFilter] = useState<'all' | 'active' | 'closed'>('all')
  const requests = data.requests.filter((item) => filter === 'all' || (filter === 'closed' ? item.status === 'chiusa' : item.status !== 'chiusa'))
  return <section><div className="section-title"><div><h2>Schede clienti</h2><p>Richieste in corso e archivio delle richieste chiuse.</p></div><label>Mostra<select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}><option value="all">Tutte</option><option value="active">In corso</option><option value="closed">Passate</option></select></label></div>
    <div className="history-list">{requests.length ? requests.map((item) => <button className="card history-card" key={item.id} onClick={() => openRequest(item.id)}><span className={'status ' + item.status}>{item.status}</span><b>{item.name}</b><span>{item.description}</span><small>{item.consultationSlot ? 'Consulenza ' + item.consultationSlot.status + ' · ' + formatDate(item.consultationSlot.date) : 'Nessuna consulenza fissata'}</small></button>) : <p className="empty">Nessuna scheda in questa categoria.</p>}</div>
  </section>
}

function Settings({ data, run }: { data: StudioData; run: Runner }) {
  const [room, setRoom] = useState(''), [artist, setArtist] = useState(''), [color, setColor] = useState('#7950f2'), [hours, setHours] = useState(data.hours)
  const ask = (text: string, initial = '') => window.prompt(text, initial)
  return <section className="settings"><div className="card"><h2>Orari dello studio</h2><form className="form" onSubmit={(e) => { e.preventDefault(); void run(() => studioService.setHours(hours)) }}><div className="two"><label>Apertura<input required type="time" value={hours.start} onChange={(e) => setHours({ ...hours, start: e.target.value })} /></label><label>Chiusura<input required type="time" value={hours.end} onChange={(e) => setHours({ ...hours, end: e.target.value })} /></label></div><button>Salva orari</button></form><p className="hint">Le prenotazioni e le consulenze devono rientrare negli orari dello studio.</p></div>
    <div className="card"><h2>Stanze e lettini</h2>{data.rooms.map((item) => <div className="config-room" key={item.id}><b>{item.name}</b><button className="link" onClick={() => { const value = ask('Nome stanza', item.name); if (value) void run(() => studioService.renameRoom(item.id, value)) }}>Rinomina</button><button className="link danger-text" onClick={() => void run(() => studioService.removeRoom(item.id))}>Rimuovi stanza</button>{item.beds.map((bed) => <p key={bed.id}>↳ {bed.name}<button className="link" onClick={() => { const value = ask('Nome lettino', bed.name); if (value) void run(() => studioService.renameBed(bed.id, value)) }}>Rinomina</button><button className="link danger-text" onClick={() => void run(() => studioService.removeBed(bed.id))}>Rimuovi</button></p>)}<button className="secondary" onClick={() => { const value = ask('Nome lettino'); if (value) void run(() => studioService.addBed(item.id, value)) }}>Aggiungi lettino</button></div>)}<form className="inline-form" onSubmit={(e) => { e.preventDefault(); if (room) void run(() => studioService.addRoom(room)).then((ok) => { if (ok) setRoom('') }) }}><input value={room} placeholder="Nuova stanza" aria-label="Nuova stanza" onChange={(e) => setRoom(e.target.value)} /><button>Aggiungi</button></form></div>
    <div className="card"><h2>Tatuatori</h2>{data.artists.map((item) => <p className="artist" key={item.id}><i style={{ background: item.color }} />{item.name}<button className="link" onClick={() => { const name = ask('Nome tatuatore', item.name); const nextColor = name && ask('Colore esadecimale', item.color); if (name && nextColor) void run(() => studioService.updateArtist(item.id, { name, color: nextColor })) }}>Modifica</button><button className="link danger-text" onClick={() => void run(() => studioService.removeArtist(item.id))}>Rimuovi</button></p>)}<form className="inline-form" onSubmit={(e) => { e.preventDefault(); if (artist) void run(() => studioService.addArtist({ name: artist, color })).then((ok) => { if (ok) setArtist('') }) }}><input value={artist} placeholder="Nome tatuatore" aria-label="Nome tatuatore" onChange={(e) => setArtist(e.target.value)} /><input type="color" value={color} aria-label="Colore tatuatore" onChange={(e) => setColor(e.target.value)} /><button>Aggiungi</button></form></div>
  </section>
}
export default App
