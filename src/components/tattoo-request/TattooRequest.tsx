import { useState } from 'react'
import './TattooRequest.css'

interface TattooRequestProps {
    name: string
    description: string
}

function TattooRequest({ name, description }: TattooRequestProps) {

    function handleStatusChange() {
        if (status === "new") {
            setStatus("Accettata");
        }
        else if (status === "Accettata") {
            setStatus("new");
        }
    }

    const [status, setStatus] = useState("new");



    return (
        <div>
            <h2>{name}</h2>
            <p>{description}</p>
            <p>Status: {status}</p>
            <button onClick={handleStatusChange}>{status == 'new' ? 'Accetta' : 'Annulla'}</button>
        </div>
    )
}

export default TattooRequest