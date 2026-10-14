// Stub HTTP delle richieste.
//
//   POST   /requests                         NewRequestInput → CustomerRequest
//          pubblico (senza token) per le richieste dal sito; il backend forza status `nuova`
//          e deve applicare limiti anti-spam (rate limit, captcha lato server se serve).
//   PATCH  /requests/:id                     { status }                 autenticato
//   PUT    /requests/:id/consultation        Consultation               autenticato
//   PUT    /requests/:id/slot                Omit<ConsultationSlot, 'status'>  409 se il tatuatore è occupato
//   POST   /requests/:id/slot/confirm                                   409 se non c'è una proposta
//   DELETE /requests/:id/slot
//
// Le modifiche restituiscono lo stato del gestionale riletto da GET /studio.
import { http } from '../client'
import type { CustomerRequest, StudioData } from '../types'
import type { RequestsApi } from './requestsApi'

const send = async (method: 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, body?: unknown) => {
  await http<unknown>(method, path, body)
  return http<StudioData>('GET', '/studio')
}
const at = (id: string) => '/requests/' + encodeURIComponent(id)

export const requestsApiHttp: RequestsApi = {
  create: (input) => http<CustomerRequest>('POST', '/requests', input),
  setStatus: (id, status) => send('PATCH', at(id), { status }),
  saveConsultation: (id, consultation) => send('PUT', at(id) + '/consultation', consultation),
  proposeConsultation: (id, slot) => send('PUT', at(id) + '/slot', slot),
  confirmConsultation: (id) => send('POST', at(id) + '/slot/confirm'),
  cancelConsultation: (id) => send('DELETE', at(id) + '/slot'),
}
