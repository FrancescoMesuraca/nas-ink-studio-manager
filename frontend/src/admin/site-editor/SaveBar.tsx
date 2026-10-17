import type { SaveMessage } from './useSiteDraft'

/** Barra in fondo al modulo: esito dell'ultimo salvataggio e pulsanti Salva / Annulla. */
export default function SaveBar({ dirty, saving, message, onDiscard }: { dirty: boolean; saving: boolean; message: SaveMessage | null; onDiscard: () => void }) {
  return <div className="editor-savebar">
    {message
      ? <p className={message.kind === 'ok' ? 'save-ok' : 'save-error'} role={message.kind === 'ok' ? 'status' : 'alert'}>{message.text}</p>
      : <p className="hint" role="status">{dirty ? 'Modifiche non salvate' : 'Nessuna modifica'}</p>}
    <div className="actions">
      <button disabled={!dirty || saving}>{saving ? 'Salvataggio…' : 'Salva'}</button>
      <button type="button" className="secondary" disabled={!dirty || saving} onClick={onDiscard}>Annulla modifiche</button>
    </div>
  </div>
}
