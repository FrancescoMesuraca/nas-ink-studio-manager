# NAS INK – frontend

Applicazione per uno studio di tatuaggi, con due lati:

- **Sito vetrina pubblico** (`/`): copertina, studio, galleria lavori, tatuatori, contatti e orari, con il pulsante **“Richiedi un tatuaggio”** che apre il modulo di richiesta (`/richiesta`).
- **Gestionale riservato** (`/gestionale`): lettini, agenda, richieste, schede clienti, configurazione ed editor del sito vetrina, con login per titolare e tatuatori.

React 19 + Vite + TypeScript + react-router. Le API hanno due implementazioni dietro le stesse interfacce: il backend .NET in [`../backend`](../backend/README.md), che le implementa tutte, e i mock su `localStorage`, con latenza ed errori realistici, per lavorare sul frontend senza backend. Senza `.env.local` partono i mock; `./start-dev.sh` dalla radice avvia tutto collegato al backend.

## Avvio

Tutti i comandi vanno lanciati dalla cartella `frontend/`.

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

| Comando | Cosa fa |
|---|---|
| `npm run dev` | server di sviluppo |
| `npm run build` | controllo dei tipi + build di produzione in `dist/` |
| `npm run lint` | ESLint |
| `npm test` | test (Vitest + Testing Library); `npm run test:watch` per la modalità interattiva |
| `npm run check:bookings` | controllo rapido delle regole sui conflitti di prenotazione |

## Credenziali demo

Valgono solo in modalità mock (in quella modalità sono mostrate anche nella pagina di login).

| Ruolo | Email | Password | Accesso |
|---|---|---|---|
| Titolare | `titolare@nasink.demo` | `demo1234` | tutto, incluse Configurazione e Sito vetrina |
| Tatuatore (Maya Conti) | `maya@nasink.demo` | `demo1234` | lettini, agenda, richieste, schede clienti |
| Tatuatore (Luca Neri) | `luca@nasink.demo` | `demo1234` | come sopra |

“Ripristina dati demo” (solo titolare, solo con i mock) riporta il gestionale ai dati iniziali. Per ripartire da zero anche con il sito vetrina e la sessione, svuota il `localStorage` del sito dal browser.

## Rotte

| Percorso | Pagina | Accesso |
|---|---|---|
| `/` | Home del sito vetrina | pubblico |
| `/richiesta`, `/richiesta/inviata` | Modulo “Richiedi un tatuaggio” e conferma (`?tatuatore=<id>` preseleziona il tatuatore) | pubblico |
| `/privacy` | Informativa privacy (**testo segnaposto**) | pubblico |
| `/login` | Accesso | pubblico |
| `/gestionale/lettini`, `/agenda`, `/richieste`, `/richieste/:id`, `/schede` | Gestionale | autenticato |
| `/gestionale/configurazione`, `/gestionale/sito` | Configurazione, editor del sito | solo titolare |

## Struttura

```
src/
  api/          contratto con il backend: tipi, interfacce, mock, stub HTTP (le pagine importano solo da qui)
    auth/ requests/ site/ studio/ uploads/   <dominio>Api.ts (interfaccia) · .mock.ts · .http.ts
    mock/       storage.ts (localStorage + latenza), studioStore.ts, seed/*.json
    client.ts   client fetch per il backend vero
    index.ts    sceglie mock o HTTP
  auth/         AuthProvider, useAuth, RequireAuth/RequireRole, pagina di login
  public/       sito vetrina: layout, tema, home, modulo richiesta, privacy
  admin/        gestionale: layout + una cartella per sezione (beds, agenda, requests, history, settings, site-editor)
  shared/       utilità date/orari, pagina 404
  services/bookingRules.js   regole sui conflitti (JavaScript, usate anche da scripts/check-booking-conflicts.mjs)
  router.tsx
public/demo/    illustrazioni demo del sito
```

## Passare al backend vero

1. Crea `.env.local` partendo da `.env.example`:

   ```
   VITE_USE_MOCKS=false
   VITE_API_URL=https://api.tuostudio.it
   ```

2. Implementa sul server gli endpoint documentati in testa a ogni `src/api/*/*.http.ts` (riepilogo sotto). Le pagine non vanno toccate: `src/api/index.ts` usa automaticamente le implementazioni HTTP.
3. Convenzioni attese da `src/api/client.ts`:
   - JSON in ingresso e in uscita (gli upload sono `multipart/form-data`);
   - autenticazione con `Authorization: Bearer <token>`; il token arriva da `POST /auth/login`;
   - errori come `{ "message": "...", "fields": { "campo": "..." } }` con status coerente: 400 validazione, 401 sessione assente o scaduta (il client cancella il token), 403 ruolo insufficiente, 404, 409 conflitto di orari. I messaggi vengono mostrati così come sono, quindi vanno scritti in italiano.
4. Le regole di business oggi vivono nei mock: il backend deve replicarle, in particolare `src/services/bookingRules.js` (conflitti di lettino, tatuatore e orari, da applicare anche alle consulenze), `src/api/requests/requestValidation.ts` (validazione delle richieste) e la validazione del sito in `src/api/site/siteApi.mock.ts`. I test in `src/**/*.mock.test.ts` descrivono il comportamento atteso e sono un buon punto di partenza per i test del backend.

| Metodo e percorso | Accesso | Note |
|---|---|---|
| `POST /auth/login` · `POST /auth/logout` · `GET /auth/me` | — / autenticato | `Session = { token, user }` |
| `GET /studio` | autenticato | `StudioData` completo |
| `PUT /studio/hours`, `POST/PATCH/DELETE /studio/rooms…`, `/studio/beds…`, `/studio/artists…` | titolare | 409 se si rimuove qualcosa in uso |
| `POST /studio/bookings`, `PUT/DELETE /studio/bookings/:id` | autenticato | 409 con messaggio in caso di conflitto |
| `POST /studio/reset` | solo ambienti demo | |
| `POST /requests` | **pubblico** | sempre `status: nuova`; serve rate limit / anti-spam |
| `PATCH /requests/:id`, `PUT /requests/:id/consultation`, `PUT/DELETE /requests/:id/slot`, `POST /requests/:id/slot/confirm` | autenticato | |
| `GET /site/public` | pubblico | contenuti + tatuatori + orari, nessun dato riservato |
| `PUT /site` | titolare | 400 con `fields` se non valido |
| `POST /uploads` | pubblico (con limiti) | `multipart` campo `file` → `{ url }` |

Dopo una modifica il client rilegge `GET /studio`, quindi le risposte di modifica possono anche essere `204`.

## Note e limiti attuali

- Le immagini vengono ridotte nel browser prima del caricamento. Nel mock diventano data URL salvati in `localStorage` (spazio limitato a pochi MB); con il backend vanno su `POST /uploads`.
- Nessuna email o notifica al cliente; la conferma della consulenza nel gestionale è simulata.
- L’informativa privacy è un testo segnaposto da sostituire con quella dello studio.
- Il controllo dei ruoli nel mock riguarda login e salvataggio del sito; il backend li verifica su tutte le operazioni.
- Fuori dallo scopo per ora: pagamenti/caparre, multi-studio, prenotazione autonoma da parte del cliente, SEO avanzato/SSR.
