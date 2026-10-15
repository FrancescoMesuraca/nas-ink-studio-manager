import { useState } from 'react'
import { requestsApi, type Consultation, type ConsultationSlot, type CustomerRequest, type StudioData } from '../../api'
import { dateText, dateTimeText, formatDate, nextHour } from '../../shared/time'
import type { Runner } from '../adminContext'

export default function RequestDetail({ request, data, run }: { request: CustomerRequest; data: StudioData; run: Runner }) {
  const [form, setForm] = useState(request.consultation)
  const [slot, setSlot] = useState<Omit<ConsultationSlot, 'status'>>({ artistId: request.consultationSlot?.artistId ?? data.artists[0]?.id ?? '', date: request.consultationSlot?.date ?? dateText(new Date()), start: request.consultationSlot?.start ?? data.hours.start, end: request.consultationSlot?.end ?? nextHour(data.hours) })
  const set = (key: keyof Consultation, value: string) => setForm({ ...form, [key]: value })
  const preferredArtist = data.artists.find((artist) => artist.id === request.preferredArtistId)
  return <article className="card detail"><h2>{request.name}</h2>
    <p className="request-meta"><span className={'source ' + request.source}>{request.source === 'sito' ? 'Dal sito' : 'Dal gestionale'}</span>{request.createdAt && <span>Ricevuta il {dateTimeText(request.createdAt)}</span>}</p>
    <p>{request.email || request.phone ? <>{request.email && <a href={'mailto:' + request.email}>{request.email}</a>}{request.email && request.phone && ' · '}{request.phone && <a href={'tel:' + request.phone.replace(/s+/g, '')}>{request.phone}</a>}</> : request.contact}</p>
    <p><b>Idea:</b> {request.description}</p><p>{request.bodyArea} · {request.size} · {request.style}</p>
    {preferredArtist && <p><b>Tatuatore preferito:</b> {preferredArtist.name}</p>}
    {request.availability && <p><b>Disponibilità:</b> {request.availability}</p>}
    {request.references && <p><b>Riferimenti:</b> {request.references}</p>}
    {request.referenceImages.length > 0 && <div className="reference-images">{request.referenceImages.map((url, index) => <a key={index} href={url} target="_blank" rel="noreferrer"><img src={url} alt={'Riferimento ' + (index + 1) + ' inviato dal cliente'} /></a>)}</div>}
    {request.privacyConsentAt && <p className="hint">Consenso privacy accettato il {dateTimeText(request.privacyConsentAt)}.</p>}
    <label>Stato<select value={request.status} onChange={(e) => void run(() => requestsApi.setStatus(request.id, e.target.value as CustomerRequest['status']))}>{['nuova', 'consulenza', 'approvata', 'chiusa'].map((status) => <option key={status}>{status}</option>)}</select></label>
    <hr /><h3>Consulenza in studio</h3><p className="hint">Il tatuatore propone una fascia. La conferma del cliente è simulata qui; non viene inviata alcuna comunicazione.</p>
    {request.consultationSlot && <p className="slot-summary"><b>{request.consultationSlot.status === 'confermata' ? 'Appuntamento confermato' : 'Proposta in attesa'}</b> · {formatDate(request.consultationSlot.date)} {request.consultationSlot.start}–{request.consultationSlot.end} · {data.artists.find((artist) => artist.id === request.consultationSlot?.artistId)?.name}</p>}
    <form className="form" onSubmit={(e) => { e.preventDefault(); void run(() => requestsApi.proposeConsultation(request.id, slot)) }}>
      <label>Tatuatore<select required value={slot.artistId} onChange={(e) => setSlot({ ...slot, artistId: e.target.value })}>{data.artists.map((artist) => <option key={artist.id} value={artist.id}>{artist.name}</option>)}</select></label>
      <div className="three"><label>Data proposta<input required type="date" value={slot.date} onChange={(e) => setSlot({ ...slot, date: e.target.value })} /></label><label>Inizio<input required type="time" min={data.hours.start} max={data.hours.end} value={slot.start} onChange={(e) => setSlot({ ...slot, start: e.target.value })} /></label><label>Fine<input required type="time" min={data.hours.start} max={data.hours.end} value={slot.end} onChange={(e) => setSlot({ ...slot, end: e.target.value })} /></label></div>
      <div className="actions"><button disabled={!data.artists.length}>Proponi data</button>{request.consultationSlot?.status === 'proposta' && <button type="button" className="secondary" onClick={() => void run(() => requestsApi.confirmConsultation(request.id))}>Conferma cliente (demo)</button>}{request.consultationSlot && <button type="button" className="secondary" onClick={() => void run(() => requestsApi.cancelConsultation(request.id))}>Annulla fascia</button>}</div>
    </form>
    <hr /><h3>Bozza del progetto</h3><p className="hint">Bozza concettuale per discuterne insieme, non un disegno definitivo.</p><form className="form" onSubmit={(e) => { e.preventDefault(); void run(() => requestsApi.saveConsultation(request.id, form)) }}><label>Note<textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} /></label>{(['subject', 'composition', 'style', 'position', 'size', 'colors'] as const).map((key) => <label key={key}>{({ subject: 'Soggetto', composition: 'Composizione', style: 'Stile', position: 'Posizione', size: 'Dimensioni', colors: 'Colori' })[key]}<input value={form[key]} onChange={(e) => set(key, e.target.value)} /></label>)}<label>URL immagine di riferimento o bozza<input type="url" value={form.imageUrl} onChange={(e) => set('imageUrl', e.target.value)} /></label>{form.imageUrl && <img className="preview" src={form.imageUrl} alt="Anteprima bozza o riferimento" />}<button>Salva scheda</button></form>
  </article>
}
