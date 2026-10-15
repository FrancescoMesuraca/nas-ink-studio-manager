import type { GalleryItem, PublicArtist } from '../../../api'
import { moveItem } from '../../../shared/list'
import { ArtistSelect, OrderButtons } from '../../../shared/ui'
import ImageField from '../ImageField'
import Panel, { FieldError } from '../Panel'
import type { PanelProps } from '../useSiteDraft'

export default function GalleryPanel({ draft, update, errors, artists }: PanelProps & { artists: PublicArtist[] }) {
  const setGallery = (change: (gallery: GalleryItem[]) => GalleryItem[]) => update((content) => ({ ...content, gallery: change(content.gallery) }))
  const setItem = (id: string, fields: Partial<GalleryItem>) => setGallery((gallery) => gallery.map((item) => item.id === id ? { ...item, ...fields } : item))
  const add = () => setGallery((gallery) => [...gallery, { id: crypto.randomUUID(), imageUrl: '' }])
  const remove = (id: string) => setGallery((gallery) => gallery.filter((item) => item.id !== id))
  const move = (index: number, delta: number) => setGallery((gallery) => moveItem(gallery, index, delta))

  return <Panel title={'Galleria (' + draft.gallery.length + ')'}>
    <FieldError message={errors.gallery} />
    <ol className="editor-list gallery-list">
      {draft.gallery.map((item, index) => <li key={item.id}>
        <ImageField label={'Foto ' + (index + 1)} value={item.imageUrl} onChange={(imageUrl) => setItem(item.id, { imageUrl })} />
        <div className="two">
          <label>
            Didascalia
            <input value={item.caption ?? ''} onChange={(e) => setItem(item.id, { caption: e.target.value })} />
          </label>
          <label>
            Tatuatore
            <ArtistSelect artists={artists} emptyLabel="—" value={item.artistId ?? ''} onChange={(artistId) => setItem(item.id, { artistId: artistId || undefined })} />
          </label>
        </div>
        <OrderButtons index={index} count={draft.gallery.length} label={'foto ' + (index + 1)} onMove={(delta) => move(index, delta)}>
          <button type="button" className="link danger-text" onClick={() => remove(item.id)}>Rimuovi foto</button>
        </OrderButtons>
      </li>)}
    </ol>
    <button type="button" className="secondary" onClick={add}>Aggiungi foto</button>
  </Panel>
}
