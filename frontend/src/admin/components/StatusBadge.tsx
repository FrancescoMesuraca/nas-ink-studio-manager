import type { CustomerRequest } from '../../api'

/** Etichetta colorata con lo stato di una richiesta (i colori sono in admin.css, `.status.<stato>`). */
export default function StatusBadge({ status }: { status: CustomerRequest['status'] }) {
  return <span className={'status ' + status}>{status}</span>
}
