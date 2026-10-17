/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** `false` per usare il backend vero; qualsiasi altro valore (o assente) usa i mock su localStorage. */
  readonly VITE_USE_MOCKS?: string
  /** URL base del backend, es. `https://api.studio.it/v1`. Usato solo quando VITE_USE_MOCKS=false. */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
