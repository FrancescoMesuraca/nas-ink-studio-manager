import { useId, useRef, useState } from 'react'
import { errorMessage, uploadsApi } from '../../api'

/** Immagine del sito: URL incollato oppure file caricato (nel mock diventa un data URL compresso). */
export default function ImageField({ label, value, onChange, optional = false }: { label: string; value?: string; onChange: (url: string) => void; optional?: boolean }) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const isDataUrl = value?.startsWith('data:')

  const upload = async (file?: File) => {
    if (!file) return
    setBusy(true)
    setError('')
    try { onChange((await uploadsApi.uploadImage(file)).url) }
    catch (e) { setError(errorMessage(e, 'Caricamento non riuscito.')) }
    finally { setBusy(false) }
  }

  return <div className="image-field">
    <label htmlFor={id}>{label}{optional && <small> (facoltativa)</small>}</label>
    <div className="image-field-row">
      {value ? <img src={value} alt="" /> : <span className="image-field-empty" aria-hidden="true">—</span>}
      <div className="image-field-controls">
        <input id={id} type="text" inputMode="url" placeholder="https://… oppure carica un file" value={isDataUrl ? 'Immagine caricata' : value ?? ''} readOnly={isDataUrl} onChange={(e) => onChange(e.target.value)} />
        <div className="image-field-actions">
          <button type="button" className="secondary" disabled={busy} onClick={() => input.current?.click()}>{busy ? 'Caricamento…' : 'Carica'}</button>
          {value && <button type="button" className="link danger-text" onClick={() => onChange('')}>Rimuovi</button>}
        </div>
      </div>
    </div>
    <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = '' }} />
    {error && <p className="field-error" role="alert">{error}</p>}
  </div>
}
