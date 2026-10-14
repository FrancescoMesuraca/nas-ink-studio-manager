# Piano: sito vetrina + gestionale con login (servizi finti)

## Obiettivo

L'app ha due lati:

1. **Sito vetrina (pubblico)**: pagina dello studio con foto, testi, tatuatori, contatti e un pulsante ben visibile **"Richiedi un tatuaggio"** che porta a un modulo di richiesta.
2. **Gestionale (privato)**: si entra con login (titolare e dipendenti). Contiene il gestionale che c'è già oggi (lettini, agenda, richieste, schede clienti, configurazione), più una nuova sezione **"Sito vetrina"** in cui il titolare personalizza il sito.

Il backend **non c'è ancora**. Tutti i servizi (login, richieste, contenuti del sito, gestionale) sono **finti** (mock su `localStorage` con un piccolo ritardo simulato), ma con contratti TypeScript e struttura già pronti per collegare un backend vero in questa repo senza toccare le pagine.

## Ipotesi (da confermare)

- **Uno studio per installazione** (niente multi-tenant). "Personalizzabile per il cliente" vuol dire che il titolare dello studio modifica testi, foto, colori e sezioni dal gestionale.
- **Due ruoli**: `titolare` (accesso completo) e `tatuatore` (dipendente: agenda, richieste e schede clienti; niente configurazione né sito vetrina).
- Interfaccia tutta in **italiano**.
- Le immagini, per ora, sono URL oppure file caricati e convertiti in data URL dal mock (con un limite di dimensione). Il caricamento vero arriverà con il backend.

## Stato attuale (punto di partenza)

- React 19 + Vite + TypeScript, CSS semplice, nessun router, nessun test.
- `src/App.tsx` (~160 righe molto dense) contiene tutto il gestionale: `Beds`, `BookingDialog`, `ArtistAgenda`, `Requests`, `RequestDetail`, `History`, `Settings`.
- `src/services/studioService.ts` è già un mock asincrono su `localStorage` (chiave `nas-ink-studio-data`) con i dati iniziali in `src/data/studio.json`.
- `src/services/bookingRules.js` (+ `.d.ts`) contiene le regole sui conflitti, usate anche da `scripts/check-booking-conflicts.mjs`: **va lasciato in JS e funzionante**.
- `src/components/tattoo-request/TattooRequest.tsx` non è usato: si può rimuovere.

## Architettura proposta

### Rotte (react-router)

| Percorso | Pagina | Accesso |
|---|---|---|
| `/` | Home vetrina (hero, chi siamo, galleria, tatuatori, orari/contatti, CTA) | pubblico |
| `/richiesta` | Modulo "Richiedi un tatuaggio" | pubblico |
| `/richiesta/inviata` | Conferma invio | pubblico |
| `/login` | Login | pubblico (se già loggato → `/gestionale`) |
| `/gestionale` | Dashboard o redirect a lettini | autenticato |
| `/gestionale/lettini`, `/agenda`, `/richieste`, `/richieste/:id`, `/schede` | Sezioni esistenti | autenticato |
| `/gestionale/configurazione` | Orari, stanze, tatuatori | solo `titolare` |
| `/gestionale/sito` | Editor del sito vetrina con anteprima | solo `titolare` |
| `*` | 404 | pubblico |

Oggi le schede sono uno stato `tab` in `App.tsx`: diventano rotte vere, così i link (es. "apri richiesta") e il tasto indietro funzionano.

### Livello API (la parte importante per il backend futuro)

```
src/api/
  types.ts            # DTO condivisi (o riuso di src/types.ts), ApiError
  client.ts           # httpClient basato su fetch (baseUrl da VITE_API_URL, token, errori) — pronto ma non usato
  index.ts            # sceglie mock o http in base a VITE_USE_MOCKS (default: true)
  auth/      authApi.ts (interfaccia) · authApi.mock.ts · authApi.http.ts (stub)
  requests/  requestsApi.ts · .mock.ts · .http.ts
  site/      siteApi.ts · .mock.ts · .http.ts
  studio/    studioApi.ts · .mock.ts · .http.ts   # l'attuale studioService
  mock/      storage.ts (localStorage + latenza simulata) · seed/*.json
```

- Ogni dominio ha un'**interfaccia** TypeScript. Le pagine importano solo da `src/api` e non sanno se sotto c'è il mock o l'HTTP.
- Le implementazioni `*.http.ts` sono stub che chiamano `client.ts` con gli endpoint REST previsti (es. `POST /auth/login`, `GET /site`, `POST /requests`). Non devono funzionare oggi, ma devono compilare e documentare il contratto.
- Il mock simula latenza (~300 ms) ed errori realistici (`ApiError` con `status` e `message`), così la UI gestisce già caricamento ed errori.
- `studioService` attuale diventa `studioApi.mock.ts` **senza cambiare la logica**. La richiesta pubblica e quella inserita dal gestionale usano la stessa `requestsApi.create`, quindi una richiesta inviata dal sito compare subito tra le "Richieste" con stato `nuova`.
- File `.env.example` con `VITE_USE_MOCKS=true` e `VITE_API_URL=`.

### Autenticazione (finta)

- `authApi`: `login(email, password)`, `logout()`, `me()`. Restituisce `{ token, user: { id, name, email, role, artistId? } }`.
- Utenti finti in `src/api/mock/seed/users.json` (un titolare e due tatuatori collegati agli artisti esistenti). Le credenziali demo vanno scritte nel README e mostrate come suggerimento nella pagina di login **solo in modalità mock**.
- `AuthProvider` (context) + hook `useAuth()`; sessione salvata in `localStorage` e ripristinata con `me()` all'avvio.
- `RequireAuth` (redirect a `/login?redirect=...`) e `RequireRole` (pagina "Accesso non consentito").
- Il pulsante "Ripristina dati demo" resta, ma solo per il titolare e solo in modalità mock.

### Sito vetrina personalizzabile

Tipo `SiteContent` salvato da `siteApi`:

```ts
type SiteContent = {
  studioName: string
  logoUrl?: string
  theme: { accent: string; background: 'dark' | 'light'; font: 'classic' | 'modern' | 'bold' }  // poche scelte guidate, non un page builder
  hero: { title: string; subtitle: string; imageUrl: string; ctaLabel: string }
  about: { title: string; text: string; imageUrl?: string }
  gallery: { id: string; imageUrl: string; caption?: string; artistId?: string }[]
  showArtists: boolean            // i tatuatori arrivano da studioApi (nome, colore) + bio/foto opzionali
  contacts: { address: string; phone: string; email: string; instagram?: string; mapUrl?: string }
  sections: { id: 'about' | 'gallery' | 'artists' | 'contacts'; visible: boolean }[]  // ordine = ordine in pagina
}
```

- Il tema si applica con **variabili CSS** sul layout pubblico, così il titolare cambia colori e font senza rompere il layout.
- Gli orari mostrati nel sito vengono dagli orari dello studio già configurati.
- Editor in `/gestionale/sito`: form a sezioni a sinistra e **anteprima live** a destra (lo stesso componente della home pubblica, con i dati della bozza), con i pulsanti "Salva" e "Annulla modifiche".
- Contenuti demo di partenza curati (testi e foto segnaposto), così il sito appare bello già al primo avvio.

### Modulo "Richiedi un tatuaggio"

- Campi: nome, email, telefono (almeno uno dei due), idea/descrizione, zona del corpo, dimensioni indicative, stile (select con "Non so"), tatuatore preferito (facoltativo), immagini di riferimento (facoltative, fino a 3, mock → data URL con limite), disponibilità indicativa (facoltativa).
- **Consenso privacy obbligatorio** (checkbox con link a una pagina/testo informativa segnaposto). Siamo in Italia e raccogliamo dati personali.
- Validazione lato client con messaggi chiari. Dopo l'invio, redirect alla pagina di conferma.
- Il tipo `CustomerRequest` va esteso in modo compatibile (es. `contact` resta, si aggiungono `email`, `phone`, `preferredArtistId`, `referenceImages`, `createdAt`, `source: 'sito' | 'gestionale'`), aggiornando seed e migrazione dei dati salvati in `localStorage`.

### Organizzazione delle cartelle

```
src/
  api/                 # vedi sopra
  auth/                # AuthProvider, useAuth, RequireAuth, RequireRole
  public/              # layout pubblico, Home, sezioni, RequestForm, pagine conferma/404/privacy
  admin/               # layout gestionale (nav per ruolo, utente, logout) + una cartella per sezione:
    beds/ agenda/ requests/ history/ settings/ site-editor/
  shared/              # componenti UI comuni (Button, Field, Modal, ErrorBanner, Spinner), utilità date/orari
  router.tsx
```

Lo spezzettamento di `App.tsx` deve essere un **refactoring puro**: stessi comportamenti e stesse regole di business. Va fatto prima delle novità, così eventuali regressioni restano isolate.

## Fasi

1. **Fondamenta**: installare `react-router`, creare `src/api` con interfacce + mock (spostando `studioService`), `.env.example`, `client.ts` e stub HTTP. Rimuovere `TattooRequest` non usato.
2. **Refactoring gestionale**: spezzare `App.tsx` in `admin/*` con rotte reali e layout gestionale. Comportamento invariato.
3. **Autenticazione**: auth mock, provider, pagina login, guardie per auth e ruolo, menu filtrato per ruolo, logout.
4. **Sito vetrina**: layout pubblico, home con sezioni, tema tramite variabili CSS, contenuti demo, responsive (mobile per primo: il pubblico arriva quasi sempre da Instagram su telefono).
5. **Modulo richiesta**: modulo pubblico → `requestsApi.create` → visibile nel gestionale. Estensione del tipo + migrazione.
6. **Editor sito**: `/gestionale/sito` con anteprima live.
7. **Qualità**: aggiungere Vitest + Testing Library con test su mock API (richieste, auth, regole di prenotazione), guardie di rotta e invio del modulo. Aggiornare il README (avvio, credenziali demo, come passare al backend vero). Verifica finale.

## Verifica (a fine di ogni fase)

- `npm run build`, `npm run lint`, `npm run check:bookings` (e `npm test` dalla fase 7) devono passare.
- Prova manuale nel browser: invio di una richiesta dal sito → login come titolare → la richiesta è tra le "Richieste" → login come tatuatore → niente configurazione né editor del sito → modifica del sito da titolare → la home pubblica si aggiorna.
- Controllo a 375 px di larghezza per le pagine pubbliche.

## Fuori dallo scopo (per ora)

Backend vero, upload reali, email/notifiche al cliente, pagamenti/caparre, multi-studio, prenotazione online autonoma da parte del cliente, SEO avanzato/SSR.
