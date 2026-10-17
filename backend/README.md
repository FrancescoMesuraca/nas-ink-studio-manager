# NAS INK – backend (.NET)

API in .NET 10 che implementa tutto il contratto del frontend (`frontend/src/api/*/*.http.ts`): con `VITE_USE_MOCKS=false` il frontend non usa più nessun mock.

Endpoint:

| Metodo e percorso | Accesso | Note |
|---|---|---|
| `POST /auth/login` | pubblico | `{ email, password }` → `{ token, user }`; 400 se mancano i dati, 401 se errati; massimo 10 tentativi ogni 5 minuti per IP |
| `GET /auth/me` | autenticato | utente del token; 401 se manca, è scaduto o revocato |
| `POST /auth/logout` | autenticato | revoca il token (204) |
| `GET /site/public` | pubblico | contenuti del sito + tatuatori + orari |
| `GET /studio` | autenticato | `StudioData`: orari, sale con lettini, tatuatori, prenotazioni e richieste |
| `PUT /studio/hours` | titolare | `{ start, end }`; 400 se non validi, 409 se prenotazioni o consulenze esistenti resterebbero fuori orario |
| `POST /studio/rooms`, `PATCH`/`DELETE /studio/rooms/:id` | titolare | `{ name }`; eliminando una sala si eliminano i suoi lettini; 409 se ha lettini usati in prenotazioni |
| `POST /studio/rooms/:roomId/beds`, `PATCH`/`DELETE /studio/beds/:id` | titolare | `{ name }`; 409 se il lettino è usato in prenotazioni |
| `POST /studio/artists`, `PUT`/`DELETE /studio/artists/:id` | titolare | `{ name, color }` con colore `#rrggbb`; 409 se il tatuatore ha prenotazioni, consulenze o un account del gestionale |
| `POST /studio/reset` | titolare | ricarica i dati demo del gestionale (utenti e sito restano); solo con `Demo:AllowReset` (attivo in sviluppo), altrimenti 404 |
| `POST /studio/bookings`, `PUT /studio/bookings/:id`, `DELETE /studio/bookings/:id` | autenticato | regole di `bookingRules.js`: 400 se lettino, tatuatore o orario non sono validi (fuori dagli orari dello studio, fine prima dell'inizio); 409 se il lettino o il tatuatore sono occupati, anche da una consulenza; 404 se la prenotazione non esiste |
| `POST /requests` | pubblico per `source: "sito"`, autenticato per `"gestionale"` | validazione come `requestValidation.ts`, 400 con `fields`; 401 per `"gestionale"` senza login; massimo 5 invii ogni 10 minuti per IP (429) |
| `PATCH /requests/:id` | autenticato | `{ status }`; 400 se lo stato non è valido, 404 se la richiesta non esiste |
| `PUT /requests/:id/consultation` | autenticato | salva la scheda di consulenza (i campi mancanti diventano vuoti) |
| `PUT /requests/:id/slot` | autenticato | propone una fascia di consulenza; 400 se tatuatore o orario non sono validi, 409 se il tatuatore ha una prenotazione o un'altra consulenza |
| `POST /requests/:id/slot/confirm` | autenticato | conferma la proposta e porta la richiesta in `consulenza`; 409 se non c'è una proposta |
| `DELETE /requests/:id/slot` | autenticato | annulla la fascia di consulenza |
| `PUT /site` | titolare | salva i contenuti del sito; 400 con `fields` se non validi |
| `POST /uploads` | pubblico | `multipart/form-data`, campo `file` → `{ url }` (201); solo JPG, PNG, WebP o GIF, riconosciuti dal contenuto (400); massimo 5 MB (413); senza login massimo 20 caricamenti ogni 10 minuti per IP (429) |
| `GET /uploads/:nome` | pubblico | le immagini caricate, con cache lunga |

Utenti demo (da `src/NasInk.Api/Data/Seed/users.json`, password `demo1234`): `titolare@nasink.demo` (titolare), `maya@nasink.demo` e `luca@nasink.demo` (tatuatori).

Nomi di sale, lettini e tatuatori: obbligatori, al massimo 120 caratteri. Le modifiche della configurazione rispondono `204` (`201` con l'elemento creato): il frontend poi rilegge `GET /studio`.

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

L'API ascolta su `http://localhost:5080`. Al primo avvio, in ambiente `Development`, applica le migrazioni e carica i dati demo (gli stessi del frontend, in `src/NasInk.Api/Data/Seed/`). Le prenotazioni e le consulenze demo vengono spostate sul giorno corrente (fuso `Studio:TimeZone`, predefinito `Europe/Rome`), così l'agenda appena aperta non è vuota. Il seed parte solo su un database vuoto: per riavere le prenotazioni demo su oggi in un giorno successivo serve `docker compose down -v`. Prova con:

```bash
curl http://localhost:5080/site/public
```

### Documentazione delle API (Swagger)

Con l'API accesa in sviluppo:

- **http://localhost:5080/swagger**: Swagger UI con tutti gli endpoint, i corpi delle richieste e delle risposte e gli errori possibili. Per provare quelli protetti: esegui `POST /auth/login` con un utente demo, copia il `token`, premi *Authorize* e incollalo.
- **http://localhost:5080/openapi/v1.json**: il documento OpenAPI, utile per generare client o importarlo in Postman.

Il documento è generato dal codice (`Microsoft.AspNetCore.OpenApi`): descrizioni e codici di risposta stanno accanto a ogni `Map…` negli `*Endpoints.cs` (`.WithSummary`, `.Produces`, `.ProducesErrors`). Login, lucchetto e 401/403 sugli endpoint protetti vengono aggiunti in `OpenApi/OpenApiSetup.cs`. In produzione Swagger non è attivo.

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

## Formattazione

Il codice C# è formattato con [CSharpier](https://csharpier.com/), installato come strumento locale (`../.config/dotnet-tools.json`). La prima volta:

```bash
dotnet tool restore
```

Per formattare il backend, oppure solo controllare che sia già formattato (utile prima di un commit):

```bash
dotnet csharpier format .
```

```bash
dotnet csharpier check .
```

Le migrazioni generate da EF Core sono escluse (`.csharpierignore`).

## Collegare il frontend

In `frontend/.env.local`:

```
VITE_USE_MOCKS=false
VITE_API_URL=http://localhost:5080
```

Poi riavvia `npm run dev`, perché Vite legge le variabili d'ambiente solo all'avvio. CORS: in sviluppo l'API accetta richieste da qualunque indirizzo locale (`localhost`, `127.0.0.1`, su qualsiasi porta), quindi funziona anche quando Vite passa a 5174 o 5175 perché la 5173 è occupata. Fuori dallo sviluppo sono ammesse solo le origini elencate in `Cors:Origins`.

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
    OpenApi/                   documento OpenAPI e Swagger UI (solo sviluppo)
    Requests/                  endpoint /requests e limite anti-spam
    Site/                      endpoint /site
    Studio/                    endpoint /studio: agenda (StudioEndpoints), configurazione (StudioConfigEndpoints), StudioClock
    Uploads/                   POST /uploads e file serviti da /uploads
  tests/NasInk.Api.Tests/      xUnit + WebApplicationFactory + Testcontainers
```

Scelte principali:

- **Minimal API**: un file `*Endpoints.cs` per area, come `frontend/src/api/<area>/`.
- **PostgreSQL + EF Core**: `SiteContent` è salvato in una colonna `jsonb`, perché si legge e si salva sempre tutto insieme. Tatuatori e orari stanno in tabelle normali, dato che li userà anche il gestionale. Sale, lettini e prenotazioni hanno chiavi esterne: un lettino o un tatuatore con prenotazioni non si può eliminare (vincolo `Restrict`, da tradurre in 409). Date e orari restano stringhe `yyyy-MM-dd` e `HH:mm` come nel contratto.
- **Errori**: per rispondere con un errore previsto, negli endpoint si lancia `ApiException(status, messaggio, campi)`. Le eccezioni impreviste diventano un `500` generico e le rotte inesistenti un `404`, sempre nel formato `{ "message": "..." }`.
- **JSON**: camelCase, e i campi `null` vengono omessi, così i campi facoltativi TypeScript (`bio?: string`) arrivano come assenti.
- **Anti-spam**: `POST /requests` usa il rate limiter di ASP.NET Core (finestra fissa per indirizzo IP). Si regola in `RateLimiting:PublicForm` (`PermitLimit`, `WindowMinutes`).
- **Upload**: i file vanno nella cartella `Uploads:Path` (predefinita `App_Data/uploads/` accanto all'API, esclusa da git; non `uploads/`, che su macOS coinciderebbe con la cartella del codice `Uploads/`) con un nome casuale, e il formato si controlla dai primi byte, non dal nome. Il frontend riduce le foto a 1280 px prima di inviarle. L'URL restituito è assoluto: in produzione, dietro un proxy, va impostato `Uploads:PublicBaseUrl`. Altre impostazioni: `Uploads:MaxBytes`, `Uploads:RateLimit:PermitLimit` e `WindowMinutes`.
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

## Limiti noti e prossimi passi

- **Conflitti simultanei**: i conflitti tra prenotazioni e consulenze sono controllati dal codice prima di salvare. Se due persone salvano nello stesso istante due appuntamenti sovrapposti, possono passare entrambi. Si può chiudere il buco con un vincolo del database (`EXCLUDE` di PostgreSQL) o una transazione serializzabile.
- **Immagini orfane**: un'immagine caricata e poi non usata (modulo abbandonato, foto sostituita nel sito) resta sul disco. Servirà una pulizia periodica.
- **Riferimenti delle richieste**: `referenceImages` accetta qualunque URL; si può limitare agli URL di `/uploads`.
- **Produzione**: mancano ancora la gestione degli account (creazione utenti, cambio password), l'invio di email ai clienti e la configurazione per il deploy (migrazioni, segreti, storage delle immagini su un disco persistente o uno storage di oggetti).
