import { useState } from 'react'
import type { CustomerRequest } from '../../api'
import { formatDate } from '../../shared/time'
import { useAdmin } from '../adminContext'
import StatusBadge from '../components/StatusBadge'

const filters = { all: 'Tutte', active: 'In corso', closed: 'Passate' }
type Filter = keyof typeof filters

const matches = (request: CustomerRequest, filter: Filter) => {
  if (filter === 'all') return true
  const closed = request.status === 'chiusa'
  return filter === 'closed' ? closed : !closed
}

export default function History() {
  const { data, openRequest } = useAdmin()
  const [filter, setFilter] = useState<Filter>('all')
  const requests = data.requests.filter((request) => matches(request, filter))

  return <section>
    <div className="section-title">
      <div>
        <h2>Schede clienti</h2>
        <p>Richieste in corso e archivio delle richieste chiuse.</p>
      </div>
      <label>
        Mostra
        <select value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
          {(Object.keys(filters) as Filter[]).map((key) => <option key={key} value={key}>{filters[key]}</option>)}
        </select>
      </label>
    </div>
    <div className="history-list">
      {requests.length === 0 && <p className="empty">Nessuna scheda in questa categoria.</p>}
      {requests.map((request) => <button className="card history-card" key={request.id} onClick={() => openRequest(request.id)}>
        <StatusBadge status={request.status} />
        <b>{request.name}</b>
        <span>{request.description}</span>
        <small>{request.consultationSlot ? 'Consulenza ' + request.consultationSlot.status + ' · ' + formatDate(request.consultationSlot.date) : 'Nessuna consulenza fissata'}</small>
      </button>)}
    </div>
  </section>
}
