// Client HTTP per il backend vero. Oggi non è usato (VITE_USE_MOCKS=true), ma è il punto unico
// in cui vivono baseUrl, token e traduzione degli errori in ApiError.
//
// Convenzioni attese dal backend:
// - JSON in ingresso e in uscita (tranne gli upload, multipart/form-data);
// - autenticazione con header `Authorization: Bearer <token>`;
// - errori con corpo `{ "message": string, "fields"?: { [campo]: string } }` e status HTTP coerente
//   (400 validazione, 401 non autenticato, 403 ruolo insufficiente, 404, 409 conflitto di orari).
import { apiBaseUrl } from './config'
import { tokenStore } from './session'
import { ApiError } from './types'

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export async function http<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  const token = tokenStore.get()
  if (token) headers.Authorization = 'Bearer ' + token
  let payload: BodyInit | undefined
  if (body instanceof FormData) payload = body
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  let response: Response
  try {
    response = await fetch(apiBaseUrl + path, { method, headers, body: payload })
  } catch {
    throw new ApiError(0, 'Impossibile contattare il server. Controlla la connessione.')
  }

  if (response.status === 204) return undefined as T
  const data: unknown = await response.json().catch(() => undefined)
  if (!response.ok) {
    const error = (data ?? {}) as { message?: string; fields?: Record<string, string> }
    if (response.status === 401) tokenStore.set(null)
    throw new ApiError(response.status, error.message ?? 'Errore del server (' + response.status + ').', error.fields)
  }
  return data as T
}
