import type { ArtistProfile, PublicArtist } from '../../../api'
import { ArtistDot } from '../../../shared/ui'
import ImageField from '../ImageField'
import Panel from '../Panel'
import { artistProfile, type PanelProps } from '../useSiteDraft'

export default function ArtistsPanel({ draft, update, artists }: PanelProps & { artists: PublicArtist[] }) {
  const setProfile = (artistId: string, fields: Partial<ArtistProfile>) => update((content) => ({
    ...content,
    artistProfiles: [
      ...content.artistProfiles.filter((item) => item.artistId !== artistId),
      { ...artistProfile(content, artistId), ...fields },
    ],
  }))

  return <Panel title="Tatuatori">
    <p className="hint">Nome e colore si modificano in Configurazione. Qui aggiungi bio, foto e profilo Instagram.</p>
    {artists.length === 0 && <p className="empty">Nessun tatuatore configurato.</p>}
    {artists.map((artist) => {
      const profile = artistProfile(draft, artist.id)
      return <div className="artist-profile" key={artist.id}>
        <h4><ArtistDot color={artist.color} size={12} />{artist.name}</h4>
        <label>
          Bio
          <textarea value={profile.bio ?? ''} onChange={(e) => setProfile(artist.id, { bio: e.target.value })} />
        </label>
        <label>
          Instagram
          <input placeholder="nomeutente" value={profile.instagram ?? ''} onChange={(e) => setProfile(artist.id, { instagram: e.target.value })} />
        </label>
        <ImageField label="Foto" optional value={profile.photoUrl} onChange={(photoUrl) => setProfile(artist.id, { photoUrl: photoUrl || undefined })} />
      </div>
    })}
  </Panel>
}
