// Infrastruttura comune dei mock: persistenza su localStorage e latenza simulata,
// così la UI gestisce già caricamenti ed errori come con un backend vero.
import { ApiError } from '../types'

export const mockSettings = { latency: 300 }

export const clone = <T,>(value: T): T => structuredClone(value)
export const uid = () => crypto.randomUUID()

const wait = () => mockSettings.latency > 0
  ? new Promise((resolve) => setTimeout(resolve, mockSettings.latency * (0.8 + Math.random() * 0.4)))
  : Promise.resolve()

/** Esegue `task` dopo la latenza simulata. Le eccezioni diventano promesse rifiutate. */
export async function simulate<T>(task: () => T): Promise<T> {
  await wait()
  return task()
}

export function readJson<T>(key: string): T | undefined {
  try {
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) as T : undefined
  } catch { return undefined }
}

export function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    throw new ApiError(507, 'Spazio di archiviazione della demo esaurito: usa immagini più leggere o ripristina i dati demo.')
  }
}
