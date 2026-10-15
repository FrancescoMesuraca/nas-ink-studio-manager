import { useState } from 'react'
import { formatDate } from '../../shared/time'
import { useAdmin } from '../adminContext'

export default function History() {
  const { data, openRequest } = useAdmin()
  const [filter, setFilter] = useState<'all' | 'active' | 'closed'>('all')
  const requests = data.requests.filter((item) => filter === 'all' || (filter === 'closed' ? item.status === 'chiusa' : item.status !== 'chiusa'))
  return <section><div className="section-title"><div><h2>Schede clienti</h2><p>Richieste in corso e archivio delle richieste chiuse.</p></div><label>Mostra<select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}><option value="all">Tutte</option><option value="active">In corso</option><option value="closed">Passate</option></select></label></div>
    <div className="history-list">{requests.length ? requests.map((item) => <button className="card history-card" key={item.id} onClick={() => openRequest(item.id)}><span className={'status ' + item.status}>{item.status}</span><b>{item.name}</b><span>{item.description}</span><small>{item.consultationSlot ? 'Consulenza ' + item.consultationSlot.status + ' · ' + formatDate(item.consultationSlot.date) : 'Nessuna consulenza fissata'}</small></button>) : <p className="empty">Nessuna scheda in questa categoria.</p>}</div>
  </section>
}
