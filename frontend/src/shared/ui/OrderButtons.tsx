import type { ReactNode } from 'react'

/**
 * Pulsanti ↑ ↓ per spostare l'elemento `index` di una lista lunga `count`.
 * `label` completa il testo per i lettori di schermo ("Sposta su <label>");
 * `children` aggiunge altre azioni nella stessa riga.
 */
export default function OrderButtons({ index, count, label, onMove, children }: {
  index: number
  count: number
  label: string
  onMove: (delta: -1 | 1) => void
  children?: ReactNode
}) {
  return <span className="order-buttons">
    <button type="button" className="secondary" disabled={index === 0} aria-label={'Sposta su ' + label} onClick={() => onMove(-1)}>↑</button>
    <button type="button" className="secondary" disabled={index === count - 1} aria-label={'Sposta giù ' + label} onClick={() => onMove(1)}>↓</button>
    {children}
  </span>
}
