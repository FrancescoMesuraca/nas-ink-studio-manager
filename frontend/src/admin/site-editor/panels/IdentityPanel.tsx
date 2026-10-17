import type { SiteTheme } from '../../../api'
import { Field, fieldAria } from '../../../shared/ui'
import ImageField from '../ImageField'
import Panel, { FieldError } from '../Panel'
import type { PanelProps } from '../useSiteDraft'

const backgroundNames: Record<SiteTheme['background'], string> = { dark: 'Scuro', light: 'Chiaro' }
const fontNames: Record<SiteTheme['font'], string> = { classic: 'Classico', modern: 'Moderno', bold: 'Deciso' }

export default function IdentityPanel({ draft, update, errors }: PanelProps) {
  const setTheme = (fields: Partial<SiteTheme>) => update((content) => ({ ...content, theme: { ...content.theme, ...fields } }))

  return <Panel title="Identità e tema" open>
    <Field id="site-studio-name" label="Nome dello studio" error={errors.studioName}>
      <input
        id="site-studio-name"
        value={draft.studioName}
        onChange={(e) => update((content) => ({ ...content, studioName: e.target.value }))}
        {...fieldAria('site-studio-name', errors.studioName)}
      />
    </Field>

    <ImageField label="Logo" optional value={draft.logoUrl} onChange={(logoUrl) => update((content) => ({ ...content, logoUrl: logoUrl || undefined }))} />

    <div className="two">
      <label>
        Colore principale
        <span className="color-row">
          <input type="color" value={draft.theme.accent} onChange={(e) => setTheme({ accent: e.target.value })} aria-label="Scegli il colore" />
          <input value={draft.theme.accent} onChange={(e) => setTheme({ accent: e.target.value })} aria-label="Colore esadecimale" />
        </span>
      </label>
      <fieldset className="choice">
        <legend>Sfondo</legend>
        {(['dark', 'light'] as const).map((value) => <label key={value}>
          <input type="radio" name="background" checked={draft.theme.background === value} onChange={() => setTheme({ background: value })} />
          {backgroundNames[value]}
        </label>)}
      </fieldset>
    </div>
    <FieldError message={errors.accent} />

    <fieldset className="choice">
      <legend>Carattere dei titoli</legend>
      {(['classic', 'modern', 'bold'] as const).map((value) => <label key={value} className={'font-' + value}>
        <input type="radio" name="font" checked={draft.theme.font === value} onChange={() => setTheme({ font: value })} />
        {fontNames[value]}
      </label>)}
    </fieldset>
  </Panel>
}
