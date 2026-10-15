import { useState, type FormEvent } from 'react'
import { requestsApi, type Consultation, type CustomerRequest } from '../../api'
import { useAdmin } from '../adminContext'

/** Campi di testo semplici della bozza, nell'ordine in cui compaiono. */
const textFields = { subject: 'Soggetto', composition: 'Composizione', style: 'Stile', position: 'Posizione', size: 'Dimensioni', colors: 'Colori' } as const
type TextField = keyof typeof textFields

/** Bozza concettuale del tatuaggio, compilata durante o dopo la consulenza. */
export default function ConsultationDraftForm({ request }: { request: CustomerRequest }) {
  const { run } = useAdmin()
  const [form, setForm] = useState(request.consultation)
  const set = (key: keyof Consultation, value: string) => setForm({ ...form, [key]: value })

  const save = (event: FormEvent) => {
    event.preventDefault()
    void run(() => requestsApi.saveConsultation(request.id, form))
  }

  return <>
    <h3>Bozza del progetto</h3>
    <p className="hint">Bozza concettuale per discuterne insieme, non un disegno definitivo.</p>
    <form className="form" onSubmit={save}>
      <label>
        Note
        <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} />
      </label>
      {(Object.keys(textFields) as TextField[]).map((key) => <label key={key}>
        {textFields[key]}
        <input value={form[key]} onChange={(e) => set(key, e.target.value)} />
      </label>)}
      <label>
        URL immagine di riferimento o bozza
        <input type="url" value={form.imageUrl} onChange={(e) => set('imageUrl', e.target.value)} />
      </label>
      {form.imageUrl && <img className="preview" src={form.imageUrl} alt="Anteprima bozza o riferimento" />}
      <button>Salva scheda</button>
    </form>
  </>
}
