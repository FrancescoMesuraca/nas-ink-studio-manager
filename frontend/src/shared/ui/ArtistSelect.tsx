import type { ComponentProps } from 'react'

type Props = Omit<ComponentProps<'select'>, 'value' | 'onChange' | 'children'> & {
  artists: { id: string; name: string }[]
  value: string
  onChange: (artistId: string) => void
  /** Se indicata, aggiunge in cima un'opzione vuota (valore '') con questa etichetta. */
  emptyLabel?: string
}

/** Menu a tendina dei tatuatori. Gli altri attributi (id, required…) passano al `<select>`. */
export default function ArtistSelect({ artists, value, onChange, emptyLabel, ...rest }: Props) {
  return <select {...rest} value={value} onChange={(e) => onChange(e.target.value)}>
    {emptyLabel !== undefined && <option value="">{emptyLabel}</option>}
    {artists.map((artist) => <option key={artist.id} value={artist.id}>{artist.name}</option>)}
  </select>
}
