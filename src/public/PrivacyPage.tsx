import { usePublicSite } from './publicContext'

/** Testo segnaposto: va sostituito con l'informativa redatta per lo studio. */
export default function PrivacyPage() {
  const { content } = usePublicSite()
  return <section className="site-section site-page">
    <div className="site-container site-narrow site-prose">
      <h1>Informativa privacy</h1>
      <p className="site-notice">Testo segnaposto: prima della pubblicazione va sostituito con l’informativa redatta per lo studio ai sensi del Regolamento UE 2016/679 (GDPR).</p>
      <h2>Titolare del trattamento</h2>
      <p>{content.studioName}, {content.contacts.address}. Contatto: {content.contacts.email}.</p>
      <h2>Quali dati raccogliamo</h2>
      <p>Con il modulo “Richiedi un tatuaggio” raccogliamo nome, recapiti (email e/o telefono), la descrizione del progetto, eventuali immagini di riferimento e la tua disponibilità indicativa.</p>
      <h2>Perché li usiamo</h2>
      <p>Solo per rispondere alla tua richiesta, organizzare la consulenza e, se decidi di procedere, gestire l’appuntamento. La base giuridica è la tua richiesta e il consenso che esprimi inviando il modulo.</p>
      <h2>Per quanto tempo</h2>
      <p>Conserviamo le richieste per il tempo necessario a gestirle e comunque non oltre 24 mesi dall’ultimo contatto, salvo obblighi di legge.</p>
      <h2>I tuoi diritti</h2>
      <p>Puoi chiedere in qualsiasi momento accesso, rettifica o cancellazione dei tuoi dati scrivendo a {content.contacts.email}. Puoi anche proporre reclamo al Garante per la protezione dei dati personali.</p>
    </div>
  </section>
}
