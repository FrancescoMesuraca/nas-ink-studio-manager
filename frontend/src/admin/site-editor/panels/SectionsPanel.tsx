import type { SiteSectionId } from '../../../api'
import { moveItem } from '../../../shared/list'
import { OrderButtons } from '../../../shared/ui'
import Panel from '../Panel'
import type { PanelProps } from '../useSiteDraft'

const sectionNames: Record<SiteSectionId, string> = { about: 'Lo studio', gallery: 'Galleria lavori', artists: 'Tatuatori', contacts: 'Contatti e orari' }

export default function SectionsPanel({ draft, update }: PanelProps) {
  const setVisible = (id: SiteSectionId, visible: boolean) => update((content) => ({
    ...content,
    sections: content.sections.map((section) => section.id === id ? { ...section, visible } : section),
  }))
  const move = (index: number, delta: number) => update((content) => ({ ...content, sections: moveItem(content.sections, index, delta) }))

  return <Panel title="Sezioni e ordine">
    <p className="hint">L’ordine qui è l’ordine nella pagina. Le sezioni nascoste restano salvate.</p>
    <ol className="editor-list">
      {draft.sections.map((section, index) => <li key={section.id}>
        <label className="inline-check">
          <input type="checkbox" checked={section.visible} onChange={(e) => setVisible(section.id, e.target.checked)} />
          {sectionNames[section.id]}
        </label>
        <OrderButtons index={index} count={draft.sections.length} label={sectionNames[section.id]} onMove={(delta) => move(index, delta)} />
      </li>)}
    </ol>
  </Panel>
}
