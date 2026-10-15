import type { CustomerRequest } from '../../api'
import ConsultationDraftForm from './ConsultationDraftForm'
import ConsultationSlotForm from './ConsultationSlotForm'
import RequestInfo from './RequestInfo'

/**
 * Scheda di una richiesta. Va montata con `key={request.id}`: così, cambiando richiesta,
 * React ricrea i moduli e il loro stato riparte dai dati della nuova richiesta.
 */
export default function RequestDetail({ request }: { request: CustomerRequest }) {
  return <article className="card detail">
    <RequestInfo request={request} />
    <hr />
    <ConsultationSlotForm request={request} />
    <hr />
    <ConsultationDraftForm request={request} />
  </article>
}
