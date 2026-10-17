import { useState, type FormEvent } from 'react'
import { studioApi, type Artist } from '../../api'
import { ArtistDot } from '../../shared/ui'
import { useAdmin } from '../adminContext'

export default function ArtistsCard() {
  const { data, run } = useAdmin()
  const [name, setName] = useState('')
  const [color, setColor] = useState('#7950f2')

  const edit = (artist: Artist) => {
    const nextName = window.prompt('Nome tatuatore', artist.name)
    const nextColor = nextName && window.prompt('Colore esadecimale', artist.color)
    if (nextName && nextColor) void run(() => studioApi.updateArtist(artist.id, { name: nextName, color: nextColor }))
  }

  const add = (event: FormEvent) => {
    event.preventDefault()
    if (name) void run(() => studioApi.addArtist({ name, color })).then((ok) => { if (ok) setName('') })
  }

  return <div className="card">
    <h2>Tatuatori</h2>
    {data.artists.map((artist) => <p className="artist" key={artist.id}>
      <ArtistDot color={artist.color} />
      {artist.name}
      <button className="link" onClick={() => edit(artist)}>Modifica</button>
      <button className="link danger-text" onClick={() => void run(() => studioApi.removeArtist(artist.id))}>Rimuovi</button>
    </p>)}
    <form className="inline-form" onSubmit={add}>
      <input value={name} placeholder="Nome tatuatore" aria-label="Nome tatuatore" onChange={(e) => setName(e.target.value)} />
      <input type="color" value={color} aria-label="Colore tatuatore" onChange={(e) => setColor(e.target.value)} />
      <button>Aggiungi</button>
    </form>
  </div>
}
