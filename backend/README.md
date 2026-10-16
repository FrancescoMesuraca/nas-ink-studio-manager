# NAS INK – backend (.NET)

API in .NET 10 che sostituisce, un endpoint alla volta, i mock del frontend.

Endpoint implementati:

| Metodo e percorso | Accesso | Note |
|---|---|---|
| `POST /auth/login` | pubblico | `{ email, password }` → `{ token, user }`; 400 se mancano i dati, 401 se errati; massimo 10 tentativi ogni 5 minuti per IP |
| `GET /auth/me` | autenticato | utente del token; 401 se manca, è scaduto o revocato |
| `POST /auth/logout` | autenticato | revoca il token (204) |
| `GET /site/public` | pubblico | contenuti del sito + tatuatori + orari |
| `GET /studio` | autenticato | `StudioData`: orari, sale con lettini, tatuatori, prenotazioni e richieste |
| `POST /requests` | pubblico per `source: "sito"`, autenticato per `"gestionale"` | validazione come `requestValidation.ts`, 400 con `fields`; 401 per `"gestionale"` senza login; massimo 5 invii ogni 10 minuti per IP (429) |

Utenti demo (da `src/NasInk.Api/Data/Seed/users.json`, password `demo1234`): `titolare@nasink.demo` (titolare), `maya@nasink.demo` e `luca@nasink.demo` (tatuatori).

Gli altri endpoint del contratto sono ancora da fare.

## Requisiti

- [.NET SDK 10](https://dotnet.microsoft.com/download)
- Docker (per PostgreSQL in sviluppo e per i test)
- Per creare nuove migrazioni: `dotnet tool install -g dotnet-ef`

## Avvio in sviluppo

Dalla cartella `backend/`:

```bash
docker compose up -d --wait
```

```bash
dotnet run --project src/NasInk.Api
```

L'API ascolta su `http://localhost:5080`. Al primo avvio, in ambiente `Development`, applica le migrazioni e carica i dati demo (gli stessi del frontend, in `src/NasInk.Api/Data/Seed/`). Prova con:

```bash
curl http://localhost:5080/site/public
```

Per ripartire da un database vuoto (lo ricrea e lo riempie al prossimo avvio):

```bash
docker compose down -v
```

## Test

Con Docker acceso:

```bash
dotnet test
```

I test avviano l'API in memoria (`WebApplicationFactory`) con un PostgreSQL usa e getta creato da [Testcontainers](https://dotnet.testcontainers.org/), quindi non toccano il database di sviluppo.

## Collegare il frontend

In `frontend/.env.local`:

```
VITE_USE_MOCKS=false
VITE_API_URL=http://localhost:5080
```

Poi riavvia `npm run dev`, perché Vite legge le variabili d'ambiente solo all'avvio. L'API accetta richieste CORS dalle origini in `Cors:Origins` di `appsettings.Development.json` (oggi `http://localhost:5173`). Se Vite parte su un'altra porta, aggiungila lì oppure con una variabile d'ambiente, ad esempio `Cors__Origins__1=http://localhost:5174`.

## Struttura

```
backend/
  NasInk.sln
  compose.yaml                 PostgreSQL 17 per lo sviluppo
  src/NasInk.Domain/           modelli e regole di business, senza dipendenze da ASP.NET o EF
  src/NasInk.Api/              Minimal API, EF Core (Npgsql), CORS, formato degli errori
    Auth/                      JWT, login, me, logout
    Data/                      DbContext, seed, migrazioni
    Errors/                    { message, fields } per tutte le risposte di errore
    Requests/                  endpoint /requests e limite anti-spam
    Site/                      endpoint /site
    Studio/                    endpoint /studio (gestionale)
  tests/NasInk.Api.Tests/      xUnit + WebApplicationFactory + Testcontainers
```

Scelte principali:

- **Minimal API**: un file `*Endpoints.cs` per area, come `frontend/src/api/<area>/`.
- **PostgreSQL + EF Core**: `SiteContent` è salvato in una colonna `jsonb`, perché si legge e si salva sempre tutto insieme. Tatuatori e orari stanno in tabelle normali, dato che li userà anche il gestionale. Sale, lettini e prenotazioni hanno chiavi esterne: un lettino o un tatuatore con prenotazioni non si può eliminare (vincolo `Restrict`, da tradurre in 409). Date e orari restano stringhe `yyyy-MM-dd` e `HH:mm` come nel contratto.
- **Errori**: per rispondere con un errore previsto, negli endpoint si lancia `ApiException(status, messaggio, campi)`. Le eccezioni impreviste diventano un `500` generico e le rotte inesistenti un `404`, sempre nel formato `{ "message": "..." }`.
- **JSON**: camelCase, e i campi `null` vengono omessi, così i campi facoltativi TypeScript (`bio?: string`) arrivano come assenti.
- **Anti-spam**: `POST /requests` usa il rate limiter di ASP.NET Core (finestra fissa per indirizzo IP). Si regola in `RateLimiting:PublicForm` (`PermitLimit`, `WindowMinutes`).
- **Autenticazione**:
  - **Password**: nella tabella `Users` c'è solo l'hash (`PasswordHasher` di ASP.NET Core), mai la password in chiaro. L'email è salvata in minuscolo.
  - **Token**: il login restituisce un JWT firmato con `Jwt:SigningKey`, che contiene id, nome e ruolo (`titolare` o `tatuatore`) e dura `Jwt:LifetimeHours` ore (8). La chiave in `appsettings.Development.json` vale solo per lo sviluppo; in produzione va passata come segreto (`Jwt__SigningKey`, almeno 32 caratteri).
  - **Logout**: salva l'id del token in `RevokedTokens`, e da quel momento il token viene rifiutato anche se non è scaduto.
  - **Endpoint protetti**: per un endpoint autenticato si usa `.RequireAuthorization()`, per uno riservato al titolare `.RequireAuthorization(Roles.Titolare)`.

### Nuova migrazione

Dopo aver cambiato le entità o il `NasInkDbContext`:

```bash
dotnet ef migrations add NomeMigrazione -p src/NasInk.Api -o Data/Migrations
```

In sviluppo viene applicata al prossimo avvio. In produzione si genera uno script con `dotnet ef migrations script --idempotent`.

## Cosa manca

Il contratto è già definito dal frontend, che oggi lo simula su `localStorage`:

- **Endpoint e convenzioni** (JSON, `Authorization: Bearer`, formato degli errori con `message` e `fields`, status 400/401/403/404/409): sezione *Passare al backend vero* di [`../frontend/README.md`](../frontend/README.md).
- **Forma dei dati**: [`../frontend/src/api/types.ts`](../frontend/src/api/types.ts).
- **Dettaglio di ogni endpoint**: il commento in testa a ciascun `../frontend/src/api/*/*.http.ts`.
- **Regole di business da replicare** (vanno in `NasInk.Domain`): [`bookingRules.js`](../frontend/src/services/bookingRules.js) (conflitti di lettino, tatuatore e orari) e la validazione del sito in [`siteApi.mock.ts`](../frontend/src/api/site/siteApi.mock.ts).
- **Comportamento atteso**: i test `../frontend/src/**/*.mock.test.ts`, da usare come base per i test del backend.

Prossimi passi suggeriti: le modifiche del gestionale (prenotazioni con le regole di `bookingRules.js`, configurazione dello studio, gestione delle richieste), poi `POST /uploads` (le immagini di riferimento del modulo) e `PUT /site`. Oggi il gestionale si apre con i dati del backend, ma a parte "Nuova richiesta" i salvataggi rispondono 404.
