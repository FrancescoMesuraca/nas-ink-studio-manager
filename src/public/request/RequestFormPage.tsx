import { useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { ApiError, errorMessage, requestLimits, requestsApi, uploadsApi, validateNewRequest, type NewRequestInput, type RequestFieldErrors } from '../../api'
import { usePublicSite } from '../publicContext'
import './request.css'

const sizes = ['Piccolo (fino a 5 cm)', 'Medio (5–15 cm)', 'Grande (15–30 cm)', 'Molto grande (mezza manica, schiena…)', 'Non so']
const styles = ['Non so', 'Fine line', 'Minimal', 'Realistico', 'Tradizionale / old school', 'Neo-traditional', 'Giapponese', 'Blackwork', 'Lettering', 'Acquerello', 'Geometrico']
const bodyAreas = ['Braccio', 'Avambraccio', 'Polso', 'Mano', 'Spalla', 'Schiena', 'Petto', 'Costole', 'Gamba', 'Polpaccio', 'Caviglia', 'Piede', 'Collo']

type Form = { name: string; email: string; phone: string; description: string; bodyArea: string; size: string; style: string; preferredArtistId: string; availability: string; privacyConsent: boolean }
type FieldKey = keyof RequestFieldErrors
// Ordine dei campi nella pagina: il primo con un errore riceve il focus.
const fieldOrder: FieldKey[] = ['name', 'email', 'phone', 'contact', 'description', 'bodyArea', 'size', 'style', 'referenceImages', 'privacyConsent']
const fieldTarget: Partial<Record<FieldKey, string>> = { contact: 'email' }

export default function RequestFormPage() {
  const site = usePublicSite()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const preselected = params.get('tatuatore') ?? ''
  const [form, setForm] = useState<Form>({
    name: '', email: '', phone: '', description: '', bodyArea: '', size: '', style: 'Non so', availability: '', privacyConsent: false,
    preferredArtistId: site.artists.some((artist) => artist.id === preselected) ? preselected : '',
  })
  const [images, setImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(0)
  const [errors, setErrors] = useState<RequestFieldErrors>({})
  const [formError, setFormError] = useState('')
  const [sending, setSending] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
    // L'errore di un campo sparisce appena lo si corregge.
    setErrors((current) => {
      const next = { ...current }
      delete next[key as FieldKey]
      if (key === 'email' || key === 'phone') delete next.contact
      return next
    })
  }

  const toInput = (): NewRequestInput => {
    const email = form.email.trim(), phone = form.phone.trim()
    return {
      name: form.name.trim(), email, phone, contact: [email, phone].filter(Boolean).join(' · '),
      description: form.description.trim(), bodyArea: form.bodyArea.trim(), size: form.size, style: form.style,
      references: '', referenceImages: images, availability: form.availability.trim() || undefined,
      preferredArtistId: form.preferredArtistId || undefined, source: 'sito', privacyConsent: form.privacyConsent,
    }
  }

  const focusFirst = (found: RequestFieldErrors) => {
    const first = fieldOrder.find((key) => found[key])
    if (first) formRef.current?.querySelector<HTMLElement>('[data-field="' + (fieldTarget[first] ?? first) + '"]')?.focus()
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (sending || uploading) return
    const input = toInput()
    const found = validateNewRequest(input)
    setErrors(found)
    setFormError('')
    if (Object.keys(found).length) { focusFirst(found); return }
    setSending(true)
    try {
      await requestsApi.create(input)
      navigate('/richiesta/inviata', { replace: true, state: { name: input.name.split(' ')[0] } })
    } catch (e) {
      setSending(false)
      if (e instanceof ApiError && e.fields) { setErrors(e.fields); focusFirst(e.fields) }
      setFormError(errorMessage(e, 'Invio non riuscito. Riprova tra qualche minuto.'))
    }
  }

  const addImages = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])]
    event.target.value = ''
    const room = requestLimits.maxReferenceImages - images.length
    setErrors((current) => ({ ...current, referenceImages: undefined }))
    if (files.length > room) setErrors((current) => ({ ...current, referenceImages: 'Puoi allegare al massimo ' + requestLimits.maxReferenceImages + ' immagini.' }))
    for (const file of files.slice(0, Math.max(room, 0))) {
      setUploading((count) => count + 1)
      try {
        const { url } = await uploadsApi.uploadImage(file)
        setImages((current) => current.length < requestLimits.maxReferenceImages ? [...current, url] : current)
      } catch (e) {
        setErrors((current) => ({ ...current, referenceImages: errorMessage(e, 'Caricamento non riuscito.') }))
      } finally {
        setUploading((count) => count - 1)
      }
    }
  }

  const errorCount = Object.values(errors).filter(Boolean).length

  return <section className="site-section site-page">
    <div className="site-container site-narrow">
      <p className="site-eyebrow">{site.content.studioName}</p>
      <h1 className="request-title">Richiedi un tatuaggio</h1>
      <p className="request-intro">Raccontaci la tua idea: la leggiamo con calma e ti ricontattiamo per fissare una consulenza in studio. Inviare la richiesta non è un impegno.</p>

      <form ref={formRef} className="request-form" onSubmit={submit} noValidate>
        {(errorCount > 0 || formError) && <div className="request-alert" role="alert">
          {formError || (errorCount === 1 ? 'C’è un campo da sistemare.' : 'Ci sono ' + errorCount + ' campi da sistemare.')}
        </div>}

        <fieldset>
          <legend>I tuoi dati</legend>
          <Field id="name" label="Nome e cognome" required error={errors.name}>
            <input id="name" data-field="name" autoComplete="name" value={form.name} onChange={(e) => set('name', e.target.value)} {...invalid('name', errors.name)} />
          </Field>
          <p className="request-hint" id="contact-hint">Lasciaci almeno un recapito: email o telefono.</p>
          <div className="request-two">
            <Field id="email" label="Email" error={errors.email}>
              <input id="email" data-field="email" type="email" inputMode="email" autoComplete="email" value={form.email} onChange={(e) => set('email', e.target.value)} {...contactProps('email', errors)} />
            </Field>
            <Field id="phone" label="Telefono" error={errors.phone}>
              <input id="phone" data-field="phone" type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} {...contactProps('phone', errors)} />
            </Field>
          </div>
          {errors.contact && <p className="request-error" id="contact-error">{errors.contact}</p>}
        </fieldset>

        <fieldset>
          <legend>Il tatuaggio</legend>
          <Field id="description" label="Descrivi la tua idea" required error={errors.description} hint="Soggetto, significato, elementi che vorresti, colori o bianco e nero…">
            <textarea id="description" data-field="description" rows={5} value={form.description} onChange={(e) => set('description', e.target.value)} {...invalid('description', errors.description, 'description-hint')} />
          </Field>
          <div className="request-two">
            <Field id="bodyArea" label="Zona del corpo" required error={errors.bodyArea}>
              <input id="bodyArea" data-field="bodyArea" list="body-areas" placeholder="Es. avambraccio sinistro" value={form.bodyArea} onChange={(e) => set('bodyArea', e.target.value)} {...invalid('bodyArea', errors.bodyArea)} />
              <datalist id="body-areas">{bodyAreas.map((area) => <option key={area} value={area} />)}</datalist>
            </Field>
            <Field id="size" label="Dimensioni indicative" required error={errors.size}>
              <select id="size" data-field="size" value={form.size} onChange={(e) => set('size', e.target.value)} {...invalid('size', errors.size)}>
                <option value="">Scegli…</option>
                {sizes.map((size) => <option key={size}>{size}</option>)}
              </select>
            </Field>
          </div>
          <div className="request-two">
            <Field id="style" label="Stile" error={errors.style}>
              <select id="style" data-field="style" value={form.style} onChange={(e) => set('style', e.target.value)}>
                {styles.map((style) => <option key={style}>{style}</option>)}
              </select>
            </Field>
            {site.artists.length > 0 && <Field id="artist" label="Tatuatore preferito">
              <select id="artist" value={form.preferredArtistId} onChange={(e) => set('preferredArtistId', e.target.value)}>
                <option value="">Nessuna preferenza</option>
                {site.artists.map((artist) => <option key={artist.id} value={artist.id}>{artist.name}</option>)}
              </select>
            </Field>}
          </div>

          <div className="request-field">
            <span className="request-label" id="images-label">Immagini di riferimento <small>(facoltative, fino a {requestLimits.maxReferenceImages})</small></span>
            <div className="request-images" aria-labelledby="images-label">
              {images.map((url, index) => <figure key={index}>
                <img src={url} alt={'Riferimento ' + (index + 1)} />
                <button type="button" aria-label={'Rimuovi riferimento ' + (index + 1)} onClick={() => setImages(images.filter((_, i) => i !== index))}>×</button>
              </figure>)}
              {Array.from({ length: uploading }, (_, index) => <div key={'u' + index} className="request-image-loading" role="status" aria-label="Caricamento immagine" />)}
              {images.length + uploading < requestLimits.maxReferenceImages && <button type="button" className="request-add-image" data-field="referenceImages" onClick={() => fileInput.current?.click()} aria-describedby={errors.referenceImages ? 'referenceImages-error' : undefined}>
                <span aria-hidden="true">+</span>Aggiungi foto
              </button>}
            </div>
            <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden onChange={(e) => void addImages(e)} />
            {errors.referenceImages && <p className="request-error" id="referenceImages-error">{errors.referenceImages}</p>}
          </div>

          <Field id="availability" label="Disponibilità indicativa" hint="Facoltativa. Es. “sabato mattina”, “da novembre in poi”.">
            <input id="availability" value={form.availability} onChange={(e) => set('availability', e.target.value)} aria-describedby="availability-hint" />
          </Field>
        </fieldset>

        <div className={'request-consent' + (errors.privacyConsent ? ' has-error' : '')}>
          <label>
            <input type="checkbox" data-field="privacyConsent" checked={form.privacyConsent} onChange={(e) => set('privacyConsent', e.target.checked)} {...invalid('privacyConsent', errors.privacyConsent)} />
            <span>Ho letto l’<Link to="/privacy" target="_blank">informativa privacy</Link> e acconsento al trattamento dei miei dati per essere ricontattato su questa richiesta. <abbr title="obbligatorio">*</abbr></span>
          </label>
          {errors.privacyConsent && <p className="request-error" id="privacyConsent-error">{errors.privacyConsent}</p>}
        </div>

        <button className="site-button site-button-large request-submit" disabled={sending || uploading > 0}>
          {sending ? 'Invio in corso…' : uploading > 0 ? 'Caricamento immagini…' : 'Invia richiesta'}
        </button>
        <p className="request-hint">I campi con <abbr title="obbligatorio">*</abbr> sono obbligatori.</p>
      </form>
    </div>
  </section>
}

function invalid(id: string, error?: string, hint?: string) {
  const describedBy = [hint, error ? id + '-error' : undefined].filter(Boolean).join(' ')
  return { 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy || undefined }
}

/** Email e telefono condividono l'errore "almeno un recapito". */
function contactProps(id: 'email' | 'phone', errors: RequestFieldErrors) {
  const describedBy = ['contact-hint', errors[id] ? id + '-error' : undefined, errors.contact ? 'contact-error' : undefined].filter(Boolean).join(' ')
  return { 'aria-invalid': errors[id] || errors.contact ? true : undefined, 'aria-describedby': describedBy }
}

function Field({ id, label, required, error, hint, children }: { id: string; label: string; required?: boolean; error?: string; hint?: string; children: ReactNode }) {
  return <div className={'request-field' + (error ? ' has-error' : '')}>
    <label className="request-label" htmlFor={id}>{label}{required && <> <abbr title="obbligatorio">*</abbr></>}</label>
    {hint && <p className="request-hint" id={id + '-hint'}>{hint}</p>}
    {children}
    {error && <p className="request-error" id={id + '-error'}>{error}</p>}
  </div>
}
