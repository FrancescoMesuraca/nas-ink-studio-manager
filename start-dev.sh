#!/usr/bin/env bash
# Avvia l'ambiente di sviluppo completo: PostgreSQL (Docker), backend .NET e frontend Vite.
#
#   ./start-dev.sh           database + backend + frontend collegato al backend
#   ./start-dev.sh --mock    solo frontend, con le API simulate su localStorage
#   ./start-dev.sh --reset   come il primo, ma ricrea il database con i dati demo su oggi
#
# Ctrl+C spegne backend e frontend. Il database resta acceso: `docker compose -f backend/compose.yaml down`.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"
API_URL="http://localhost:5080"

MODE="full"
for arg in "$@"; do
  case "$arg" in
    --mock) MODE="mock" ;;
    --reset) MODE="reset" ;;
    -h | --help)
      sed -n '2,8p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "Opzione sconosciuta: $arg (vedi --help)" >&2
      exit 1
      ;;
  esac
done

step() { printf '\n\033[1;36m▶ %s\033[0m\n' "$1"; }
fail() {
  printf '\033[1;31m✖ %s\033[0m\n' "$1" >&2
  exit 1
}

require() {
  command -v "$1" >/dev/null 2>&1 || fail "Manca $1. $2"
}

# --- Strumenti -------------------------------------------------------------

step "Controllo gli strumenti"
require node "Installa Node.js: https://nodejs.org"
require npm "Arriva insieme a Node.js."
if [ "$MODE" != "mock" ]; then
  require dotnet "Installa .NET SDK 10: https://dotnet.microsoft.com/download"
  require docker "Installa Docker Desktop: https://www.docker.com/products/docker-desktop"
  require curl "Serve per controllare che il backend sia partito."
fi
echo "ok"

# Se una porta è già occupata (di solito un avvio precedente rimasto acceso) meglio fermarsi subito.
port_busy() { lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1; }
port_busy 5173 && fail "La porta 5173 è già occupata (un altro frontend acceso?). Chiudilo e rilancia. Chi la usa: lsof -iTCP:5173 -sTCP:LISTEN"
if [ "$MODE" != "mock" ] && port_busy 5080; then
  fail "La porta 5080 è già occupata (un altro backend acceso?). Chiudilo e rilancia. Chi la usa: lsof -iTCP:5080 -sTCP:LISTEN"
fi

# --- Docker e database -----------------------------------------------------

if [ "$MODE" != "mock" ]; then
  step "Controllo che Docker sia acceso"
  if ! docker info >/dev/null 2>&1; then
    if [ "$(uname)" = "Darwin" ]; then
      echo "Docker è spento: avvio Docker Desktop..."
      open -a Docker || fail "Non riesco ad avviare Docker Desktop."
    else
      fail "Docker è spento: avvialo e rilancia lo script."
    fi
    for _ in $(seq 1 60); do
      docker info >/dev/null 2>&1 && break
      sleep 2
    done
    docker info >/dev/null 2>&1 || fail "Docker non è pronto dopo 2 minuti."
  fi
  echo "ok"

  if [ "$MODE" = "reset" ]; then
    step "Cancello il database (verrà ricreato con i dati demo)"
    docker compose -f "$BACKEND/compose.yaml" down -v
  fi

  step "Avvio PostgreSQL"
  docker compose -f "$BACKEND/compose.yaml" up -d --wait
fi

# --- Dipendenze frontend ---------------------------------------------------

# Reinstalla se manca node_modules o se package-lock.json è cambiato dall'ultima installazione.
if [ ! -d "$FRONTEND/node_modules" ] ||
  [ "$FRONTEND/package-lock.json" -nt "$FRONTEND/node_modules/.package-lock.json" ]; then
  step "Installo le dipendenze del frontend"
  npm --prefix "$FRONTEND" install
fi

# --- Avvio -----------------------------------------------------------------

PIDS=()
cleanup() {
  trap - INT TERM HUP EXIT
  if [ ${#PIDS[@]} -gt 0 ]; then
    step "Spengo backend e frontend"
    for pid in "${PIDS[@]}"; do
      # Termina anche i processi figli (dotnet run e npm ne avviano altri).
      pkill -TERM -P "$pid" 2>/dev/null || true
      kill -TERM "$pid" 2>/dev/null || true
    done
    wait 2>/dev/null || true
  fi
}
trap cleanup INT TERM HUP EXIT

if [ "$MODE" = "mock" ]; then
  step "Avvio il frontend con le API simulate"
  VITE_USE_MOCKS=true npm --prefix "$FRONTEND" run dev -- --strictPort &
  PIDS+=($!)
else
  step "Avvio il backend su $API_URL"
  dotnet run --project "$BACKEND/src/NasInk.Api" &
  PIDS+=($!)

  echo "Aspetto che il backend risponda (la prima volta compila e prepara il database)..."
  for _ in $(seq 1 120); do
    curl -sf "$API_URL/site/public" >/dev/null 2>&1 && break
    kill -0 "${PIDS[0]}" 2>/dev/null || fail "Il backend si è fermato: guarda gli errori qui sopra."
    sleep 1
  done
  curl -sf "$API_URL/site/public" >/dev/null 2>&1 || fail "Il backend non risponde dopo 2 minuti."
  echo "ok"

  step "Avvio il frontend collegato al backend"
  # Le variabili d'ambiente hanno la precedenza sui file .env di Vite: .env.local non serve.
  VITE_USE_MOCKS=false VITE_API_URL="$API_URL" npm --prefix "$FRONTEND" run dev -- --strictPort &
  PIDS+=($!)
fi

printf '\n\033[1;32m✔ Pronto: http://localhost:5173  (Ctrl+C per fermare)\033[0m\n\n'
wait
