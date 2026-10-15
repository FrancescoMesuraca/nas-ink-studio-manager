import { useAdmin } from '../adminContext'
import StatusBadge from '../components/StatusBadge'

/** Elenco delle richieste; quella aperta è evidenziata. */
export default function RequestList({ selectedId }: { selectedId?: string }) {
  const { data, openRequest } = useAdmin()

  return <div className="request-list">
    {data.requests.map((item) => <button key={item.id} className={item.id === selectedId ? 'request selected' : 'request'} onClick={() => openRequest(item.id)}>
      <StatusBadge status={item.status} />
      {item.source === 'sito' && <span className="source sito">sito</span>}
      <b>{item.name}</b>
      <small>{item.style} · {item.bodyArea}</small>
    </button>)}
  </div>
}
