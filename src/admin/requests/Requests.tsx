import type { FormEvent } from 'react'
import { useParams } from 'react-router'
import { requestsApi, studioApi } from '../../api'
import { emptyRequestDraft, useAdmin, type RequestDraft } from '../adminContext'
import RequestDetail from './RequestDetail'

export default function Requests() {
  const { data, run, setError, openRequest, requestDraft: request, setRequestDraft: setRequest } = useAdmin()
  const { id } = useParams()
  const selected = data.requests.find((item) => item.id === id) ?? null
  const field = (key: keyof RequestDraft, value: string) => setRequest({ ...request, [key]: value })
  const create = (event: FormEvent) => {
    event.preventDefault()
    if ([request.name, request.contact, request.description, request.bodyArea, request.size, request.style].some((value) => !value.trim())) {
      setError('Compila tutti i campi richiesti, incluso un contatto.')
      return
    }
    void run(async () => { await requestsApi.create({ ...request, source: 'gestionale', referenceImages: [] }); return studioApi.getData() }).then((ok) => { if (ok) setRequest(emptyRequestDraft) })
  }
  return <section className="requests"><div><h2>Nuova richiesta</h2><form className="card form" onSubmit={create}>
    <label>Nome<input value={request.name} onChange={(e) => field('name', e.target.value)} /></label><label>Contatto<input placeholder="Email o telefono" value={request.contact} onChange={(e) => field('contact', e.target.value)} /></label><label>Idea<textarea value={request.description} onChange={(e) => field('description', e.target.value)} /></label><div className="two"><label>Zona<input value={request.bodyArea} onChange={(e) => field('bodyArea', e.target.value)} /></label><label>Dimensioni<input value={request.size} onChange={(e) => field('size', e.target.value)} /></label></div><label>Stile<input value={request.style} onChange={(e) => field('style', e.target.value)} /></label><label>Riferimenti (facoltativi)<input value={request.references} onChange={(e) => field('references', e.target.value)} /></label><button>Salva richiesta</button>
  </form></div><div><h2>Richieste</h2><div className="request-list">{data.requests.map((item) => <button className={selected?.id === item.id ? 'request selected' : 'request'} key={item.id} onClick={() => openRequest(item.id)}><span className={'status ' + item.status}>{item.status}</span>{item.source === 'sito' && <span className="source sito">sito</span>}<b>{item.name}</b><small>{item.style} · {item.bodyArea}</small></button>)}</div>{selected && <RequestDetail key={selected.id} request={selected} data={data} run={run} />}</div></section>
}
