import './App.css'
import TattooRequest from './components/tattoo-request/TattooRequest'

function App() {

  const data = [
    { name: "Mario Rossi", description: "Rosa con serpente" },
    { name: "Giulia Bianchi", description: "Tatuaggio di un uccello" },
    { name: "Luca Verdi", description: "Design geometrico" }
  ]

  return (
    <>
      <h1>Richieste: </h1>
      {data.map((item, index) => (
        <TattooRequest key={index} name={item.name} description={item.description} />
      ))}
    </>
  )
}

export default App
