import type { SiteContent, StudioHours } from '../../../api'
import { Field, fieldAria } from '../../../shared/ui'
import Panel from '../Panel'
import type { PanelProps } from '../useSiteDraft'

export default function ContactsPanel({ draft, update, errors, hours }: PanelProps & { hours: StudioHours }) {
  const setContacts = (fields: Partial<SiteContent['contacts']>) => update((content) => ({ ...content, contacts: { ...content.contacts, ...fields } }))

  return <Panel title="Contatti">
    <label>
      Indirizzo
      <input value={draft.contacts.address} onChange={(e) => setContacts({ address: e.target.value })} />
    </label>
    <div className="two">
      <label>
        Telefono
        <input type="tel" value={draft.contacts.phone} onChange={(e) => setContacts({ phone: e.target.value })} />
      </label>
      <Field id="site-email" label="Email" error={errors.email}>
        <input id="site-email" type="email" value={draft.contacts.email} onChange={(e) => setContacts({ email: e.target.value })} {...fieldAria('site-email', errors.email)} />
      </Field>
    </div>
    <div className="two">
      <label>
        Instagram
        <input placeholder="nomeutente" value={draft.contacts.instagram ?? ''} onChange={(e) => setContacts({ instagram: e.target.value || undefined })} />
      </label>
      <label>
        Link alla mappa
        <input type="url" value={draft.contacts.mapUrl ?? ''} onChange={(e) => setContacts({ mapUrl: e.target.value || undefined })} />
      </label>
    </div>
    <p className="hint">Gli orari mostrati sul sito sono quelli dello studio ({hours.start}–{hours.end}), modificabili in Configurazione.</p>
  </Panel>
}
