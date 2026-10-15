import type { SiteContent } from '../../../api'
import ImageField from '../ImageField'
import Panel from '../Panel'
import type { PanelProps } from '../useSiteDraft'

export default function AboutPanel({ draft, update }: PanelProps) {
  const setAbout = (fields: Partial<SiteContent['about']>) => update((content) => ({ ...content, about: { ...content.about, ...fields } }))

  return <Panel title="Lo studio">
    <label>
      Titolo
      <input value={draft.about.title} onChange={(e) => setAbout({ title: e.target.value })} />
    </label>
    <label>
      Testo
      <textarea rows={8} value={draft.about.text} onChange={(e) => setAbout({ text: e.target.value })} />
    </label>
    <p className="hint">Lascia una riga vuota per iniziare un nuovo paragrafo.</p>
    <ImageField label="Foto" optional value={draft.about.imageUrl} onChange={(imageUrl) => setAbout({ imageUrl: imageUrl || undefined })} />
  </Panel>
}
