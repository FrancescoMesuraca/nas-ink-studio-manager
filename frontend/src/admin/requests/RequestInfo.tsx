import { requestsApi, type CustomerRequest } from '../../api'
import { dateTimeText } from '../../shared/time'
import { ContactLinks } from '../../shared/ui'
import { useAdmin } from '../adminContext'

const statuses: CustomerRequest['status'][] = ['nuova', 'consulenza', 'approvata', 'chiusa']

/** Dati inviati dal cliente e stato della richiesta. */
export default function RequestInfo({ request }: { request: CustomerRequest }) {
  const { data, run } = useAdmin()
  const preferredArtist = data.artists.find((artist) => artist.id === request.preferredArtistId)

  return <>
    <h2>{request.name}</h2>
    <p className="request-meta">
      <span className={'source ' + request.source}>{request.source === 'sito' ? 'Dal sito' : 'Dal gestionale'}</span>
      {request.createdAt && <span>Ricevuta il {dateTimeText(request.createdAt)}</span>}
    </p>
    <p>{request.email || request.phone ? <ContactLinks email={request.email} phone={request.phone} /> : request.contact}</p>
    <p><b>Idea:</b> {request.description}</p>
    <p>{request.bodyArea} · {request.size} · {request.style}</p>
    {preferredArtist && <p><b>Tatuatore preferito:</b> {preferredArtist.name}</p>}
    {request.availability && <p><b>Disponibilità:</b> {request.availability}</p>}
    {request.references && <p><b>Riferimenti:</b> {request.references}</p>}
    {request.referenceImages.length > 0 && <div className="reference-images">
      {request.referenceImages.map((url, index) => <a key={index} href={url} target="_blank" rel="noreferrer">
        <img src={url} alt={'Riferimento ' + (index + 1) + ' inviato dal cliente'} />
      </a>)}
    </div>}
    {request.privacyConsentAt && <p className="hint">Consenso privacy accettato il {dateTimeText(request.privacyConsentAt)}.</p>}
    <label>
      Stato
      <select value={request.status} onChange={(e) => void run(() => requestsApi.setStatus(request.id, e.target.value as CustomerRequest['status']))}>
        {statuses.map((status) => <option key={status}>{status}</option>)}
      </select>
    </label>
  </>
}
