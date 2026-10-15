import type { ReactNode } from 'react'

/** Sezione richiudibile del modulo dell'editor. */
export default function Panel({ title, open = false, children }: { title: string; open?: boolean; children: ReactNode }) {
  return <details className="card editor-panel" open={open}>
    <summary>{title}</summary>
    <div className="form">{children}</div>
  </details>
}

/** Errore che riguarda un gruppo di campi (non un singolo `Field`). */
export function FieldError({ message }: { message?: string }) {
  return message ? <p className="field-error">{message}</p> : null
}
