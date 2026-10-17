// Regole di validazione di una nuova richiesta, condivise da modulo pubblico e mock.
// Il backend vero dovrà applicare le stesse regole (e rispondere 400 con `fields`).
import { requestLimits, type NewRequestInput } from '../types'

export type RequestFieldErrors = Partial<Record<'name' | 'contact' | 'email' | 'phone' | 'description' | 'bodyArea' | 'size' | 'style' | 'referenceImages' | 'privacyConsent', string>>

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const phonePattern = /^\+?[\d\s().-]{6,20}$/

export function validateNewRequest(input: NewRequestInput): RequestFieldErrors {
  const errors: RequestFieldErrors = {}
  const email = input.email?.trim() ?? ''
  const phone = input.phone?.trim() ?? ''
  if (!input.name.trim()) errors.name = 'Inserisci il tuo nome.'
  else if (input.name.trim().length > 100) errors.name = 'Il nome è troppo lungo.'
  if (email && !emailPattern.test(email)) errors.email = 'Controlla l’indirizzo email.'
  if (phone && (!phonePattern.test(phone) || phone.replace(/\D/g, '').length < 6)) errors.phone = 'Controlla il numero di telefono.'
  if (!input.contact.trim() && !email && !phone) {
    if (input.source === 'sito') errors.contact = 'Lasciaci almeno un recapito: email o telefono.'
    else errors.contact = 'Inserisci un contatto.'
  }
  if (!input.description.trim()) errors.description = 'Descrivi la tua idea.'
  else if (input.source === 'sito' && input.description.trim().length < 10) errors.description = 'Raccontaci qualcosa in più (almeno 10 caratteri).'
  if (!input.bodyArea.trim()) errors.bodyArea = 'Indica la zona del corpo.'
  if (!input.size.trim()) errors.size = 'Indica le dimensioni indicative.'
  if (!input.style.trim()) errors.style = 'Indica lo stile (anche “Non so”).'
  if (input.referenceImages.length > requestLimits.maxReferenceImages) errors.referenceImages = 'Puoi allegare al massimo ' + requestLimits.maxReferenceImages + ' immagini.'
  if (input.source === 'sito' && !input.privacyConsent) errors.privacyConsent = 'Per inviare la richiesta devi accettare l’informativa privacy.'
  return errors
}
