import { useState, type FormEvent } from 'react'
import { studioApi, type StudioData } from '../../api'
import { useAdmin } from '../adminContext'

export default function RoomsCard() {
  const { data, run } = useAdmin()
  const [newRoom, setNewRoom] = useState('')

  /** Chiede un nome e, se viene inserito, esegue `save` con quel nome. */
  const askName = (question: string, current: string, save: (name: string) => Promise<StudioData>) => {
    const name = window.prompt(question, current)
    if (name) void run(() => save(name))
  }

  const addRoom = (event: FormEvent) => {
    event.preventDefault()
    if (newRoom) void run(() => studioApi.addRoom(newRoom)).then((ok) => { if (ok) setNewRoom('') })
  }

  return <div className="card">
    <h2>Stanze e lettini</h2>
    {data.rooms.map((room) => <div className="config-room" key={room.id}>
      <b>{room.name}</b>
      <button className="link" onClick={() => askName('Nome stanza', room.name, (name) => studioApi.renameRoom(room.id, name))}>Rinomina</button>
      <button className="link danger-text" onClick={() => void run(() => studioApi.removeRoom(room.id))}>Rimuovi stanza</button>
      {room.beds.map((bed) => <p key={bed.id}>
        ↳ {bed.name}
        <button className="link" onClick={() => askName('Nome lettino', bed.name, (name) => studioApi.renameBed(bed.id, name))}>Rinomina</button>
        <button className="link danger-text" onClick={() => void run(() => studioApi.removeBed(bed.id))}>Rimuovi</button>
      </p>)}
      <button className="secondary" onClick={() => askName('Nome lettino', '', (name) => studioApi.addBed(room.id, name))}>Aggiungi lettino</button>
    </div>)}
    <form className="inline-form" onSubmit={addRoom}>
      <input value={newRoom} placeholder="Nuova stanza" aria-label="Nuova stanza" onChange={(e) => setNewRoom(e.target.value)} />
      <button>Aggiungi</button>
    </form>
  </div>
}
