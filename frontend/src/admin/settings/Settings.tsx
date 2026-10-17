import ArtistsCard from './ArtistsCard'
import HoursCard from './HoursCard'
import RoomsCard from './RoomsCard'

export default function Settings() {
  return <section className="settings">
    <HoursCard />
    <RoomsCard />
    <ArtistsCard />
  </section>
}
