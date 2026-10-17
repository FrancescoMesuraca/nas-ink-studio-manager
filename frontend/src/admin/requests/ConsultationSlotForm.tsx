import { useState, type FormEvent } from 'react'
import { requestsApi, type ConsultationSlot, type CustomerRequest } from '../../api'
import { dateText, formatDate, nextHour } from '../../shared/time'
import { ArtistSelect, TimeRange } from '../../shared/ui'
import { useAdmin } from '../adminContext'

/** Proposta di una fascia per la consulenza in studio, con conferma (simulata) o annullamento. */
export default function ConsultationSlotForm({ request }: { request: CustomerRequest }) {
  const { data, run } = useAdmin()
  const current = request.consultationSlot
  // Il modulo parte dalla fascia già proposta, oppure da oggi alla prima ora di apertura.
  const [slot, setSlot] = useState<Omit<ConsultationSlot, 'status'>>({
    artistId: current?.artistId ?? data.artists[0]?.id ?? '',
    date: current?.date ?? dateText(new Date()),
    start: current?.start ?? data.hours.start,
    end: current?.end ?? nextHour(data.hours),
  })
  const currentArtist = data.artists.find((artist) => artist.id === current?.artistId)

  const propose = (event: FormEvent) => {
    event.preventDefault()
    void run(() => requestsApi.proposeConsultation(request.id, slot))
  }

  return <>
    <h3>Consulenza in studio</h3>
    <p className="hint">Il tatuatore propone una fascia. La conferma del cliente è simulata qui; non viene inviata alcuna comunicazione.</p>
    {current && <p className="slot-summary"><b>{current.status === 'confermata' ? 'Appuntamento confermato' : 'Proposta in attesa'}</b> · {formatDate(current.date)} {current.start}–{current.end} · {currentArtist?.name}</p>}
    <form className="form" onSubmit={propose}>
      <label>
        Tatuatore
        <ArtistSelect required artists={data.artists} value={slot.artistId} onChange={(artistId) => setSlot({ ...slot, artistId })} />
      </label>
      <div className="three">
        <label>
          Data proposta
          <input required type="date" value={slot.date} onChange={(e) => setSlot({ ...slot, date: e.target.value })} />
        </label>
        <TimeRange start={slot.start} end={slot.end} hours={data.hours} onChange={(range) => setSlot({ ...slot, ...range })} />
      </div>
      <div className="actions">
        <button disabled={!data.artists.length}>Proponi data</button>
        {current?.status === 'proposta' && <button type="button" className="secondary" onClick={() => void run(() => requestsApi.confirmConsultation(request.id))}>Conferma cliente (demo)</button>}
        {current && <button type="button" className="secondary" onClick={() => void run(() => requestsApi.cancelConsultation(request.id))}>Annulla fascia</button>}
      </div>
    </form>
  </>
}
