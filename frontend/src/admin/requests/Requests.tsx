import { useParams } from 'react-router'
import { useAdmin } from '../adminContext'
import NewRequestForm from './NewRequestForm'
import RequestDetail from './RequestDetail'
import RequestList from './RequestList'

/** Richieste dei clienti: inserimento a sinistra, elenco e scheda aperta (`/richieste/:id`) a destra. */
export default function Requests() {
  const { data } = useAdmin()
  const { id } = useParams()
  const selected = data.requests.find((item) => item.id === id)

  return <section className="requests">
    <div>
      <h2>Nuova richiesta</h2>
      <NewRequestForm />
    </div>
    <div>
      <h2>Richieste</h2>
      <RequestList selectedId={selected?.id} />
      {selected && <RequestDetail key={selected.id} request={selected} />}
    </div>
  </section>
}
