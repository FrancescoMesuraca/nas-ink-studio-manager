// Scelta dell'implementazione delle API. Senza variabili d'ambiente si usano i mock.
export const isMockMode = import.meta.env.VITE_USE_MOCKS !== 'false'

export const apiBaseUrl = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')
