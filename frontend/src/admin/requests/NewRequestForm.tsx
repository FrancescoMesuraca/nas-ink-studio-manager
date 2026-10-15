import type { FormEvent } from 'react'
import { requestsApi, studioApi, validateNewRequest, type NewRequestInput } from '../../api'
import { emptyRequestDraft, useAdmin, type RequestDraft } from '../adminContext'

/**
 * Richiesta inserita dallo studio (telefono, di persona…).
 * La bozza vive nel contesto del gestionale, così non si perde cambiando sezione.
 */
export default function NewRequestForm() {
  const { run, setError, requestDraft: draft, setRequestDraft: setDraft } = useAdmin()
  const field = (key: keyof RequestDraft, value: string) => setDraft({ ...draft, [key]: value })

  const create = (event: FormEvent) => {
    event.preventDefault()
    const input: NewRequestInput = { ...draft, source: 'gestionale', referenceImages: [] }
    // Stesse regole del modulo pubblico e del backend: qui basta mostrare il primo errore.
    const firstError = Object.values(validateNewRequest(input))[0]
    if (firstError) {
      setError(firstError)
      return
    }
    void run(async () => {
      await requestsApi.create(input)
      return studioApi.getData()
    }).then((ok) => { if (ok) setDraft(emptyRequestDraft) })
  }

  return <form className="card form" onSubmit={create}>
    <label>
      Nome
      <input value={draft.name} onChange={(e) => field('name', e.target.value)} />
    </label>
    <label>
      Contatto
      <input placeholder="Email o telefono" value={draft.contact} onChange={(e) => field('contact', e.target.value)} />
    </label>
    <label>
      Idea
      <textarea value={draft.description} onChange={(e) => field('description', e.target.value)} />
    </label>
    <div className="two">
      <label>
        Zona
        <input value={draft.bodyArea} onChange={(e) => field('bodyArea', e.target.value)} />
      </label>
      <label>
        Dimensioni
        <input value={draft.size} onChange={(e) => field('size', e.target.value)} />
      </label>
    </div>
    <label>
      Stile
      <input value={draft.style} onChange={(e) => field('style', e.target.value)} />
    </label>
    <label>
      Riferimenti (facoltativi)
      <input value={draft.references} onChange={(e) => field('references', e.target.value)} />
    </label>
    <button>Salva richiesta</button>
  </form>
}
