# NAS INK – studio manager

Sito vetrina e gestionale per uno studio di tatuaggi.

| Cartella | Contenuto |
|---|---|
| [`frontend/`](frontend/README.md) | React 19 + Vite + TypeScript: sito pubblico e gestionale. Oggi funziona da solo, con API simulate su `localStorage`. |
| [`backend/`](backend/README.md) | API in .NET (da creare) che sostituirà le API simulate. |
| [`docs/`](docs/) | Piano del progetto e note comuni. |

## Avvio rapido

Tutto insieme (PostgreSQL in Docker, backend .NET e frontend collegato), dalla radice del progetto:

```bash
./start-dev.sh       # --mock: solo frontend con API simulate · --reset: database ripulito con dati demo
```

In VS Code: pannello *Esegui e debug* (`Cmd+Shift+D`), scegli la voce dal menu in alto e premi ▶; il quadrato rosso ferma tutto. In alternativa `Cmd+Shift+B` o *Terminal → Run Task*. Ctrl+C ferma backend e frontend; il database resta acceso.

Solo il frontend, a mano:

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

Comandi, credenziali demo e contratto delle API sono in [`frontend/README.md`](frontend/README.md).
