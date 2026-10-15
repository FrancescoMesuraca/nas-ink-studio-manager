import type { ReactNode } from 'react'
import './ui.css'

/**
 * Campo di un modulo: etichetta, suggerimento facoltativo, controllo ed errore.
 * Il controllo (input, select…) va passato come figlio con lo stesso `id`;
 * `fieldAria` lo collega a suggerimento ed errore per i lettori di schermo.
 */
export default function Field({ id, label, required, hint, error, children }: {
  id: string
  label: ReactNode
  required?: boolean
  hint?: string
  error?: string
  children: ReactNode
}) {
  return <div className={'field' + (error ? ' has-error' : '')}>
    <label className="field-label" htmlFor={id}>{label}{required && <> <abbr title="obbligatorio">*</abbr></>}</label>
    {hint && <p className="field-hint" id={id + '-hint'}>{hint}</p>}
    {children}
    {error && <p className="field-error" id={id + '-error'}>{error}</p>}
  </div>
}
