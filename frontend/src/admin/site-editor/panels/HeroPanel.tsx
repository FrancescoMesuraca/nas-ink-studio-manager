import type { SiteContent } from '../../../api'
import { Field, fieldAria } from '../../../shared/ui'
import ImageField from '../ImageField'
import Panel from '../Panel'
import type { PanelProps } from '../useSiteDraft'

export default function HeroPanel({ draft, update, errors }: PanelProps) {
  const setHero = (fields: Partial<SiteContent['hero']>) => update((content) => ({ ...content, hero: { ...content.hero, ...fields } }))

  return <Panel title="Copertina">
    <Field id="site-hero-title" label="Titolo" error={errors.heroTitle}>
      <input id="site-hero-title" value={draft.hero.title} onChange={(e) => setHero({ title: e.target.value })} {...fieldAria('site-hero-title', errors.heroTitle)} />
    </Field>
    <label>
      Sottotitolo
      <textarea value={draft.hero.subtitle} onChange={(e) => setHero({ subtitle: e.target.value })} />
    </label>
    <Field id="site-cta-label" label="Testo del pulsante" error={errors.ctaLabel}>
      <input id="site-cta-label" value={draft.hero.ctaLabel} onChange={(e) => setHero({ ctaLabel: e.target.value })} {...fieldAria('site-cta-label', errors.ctaLabel)} />
    </Field>
    <ImageField label="Immagine di sfondo" value={draft.hero.imageUrl} onChange={(imageUrl) => setHero({ imageUrl })} />
  </Panel>
}
