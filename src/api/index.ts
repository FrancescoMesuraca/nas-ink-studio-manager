// Unico punto di accesso alle API per le pagine: non sanno se sotto c'è il mock o il backend vero.
import { authApiHttp } from './auth/authApi.http'
import { authApiMock, demoAccounts as mockDemoAccounts } from './auth/authApi.mock'
import { isMockMode } from './config'
import { requestsApiHttp } from './requests/requestsApi.http'
import { requestsApiMock } from './requests/requestsApi.mock'
import { tokenStore } from './session'
import { studioApiHttp } from './studio/studioApi.http'
import { studioApiMock } from './studio/studioApi.mock'

export { isMockMode } from './config'
export * from './types'
export type { AuthApi } from './auth/authApi'
export type { RequestsApi } from './requests/requestsApi'
export type { StudioApi } from './studio/studioApi'

export const authApi = isMockMode ? authApiMock : authApiHttp
export const studioApi = isMockMode ? studioApiMock : studioApiHttp
export const requestsApi = isMockMode ? requestsApiMock : requestsApiHttp

/** Credenziali demo, solo in modalità mock (vuoto con il backend vero). */
export const demoAccounts = isMockMode ? mockDemoAccounts : []

/** C'è un token salvato da verificare con `authApi.me()`. */
export const hasStoredSession = () => tokenStore.get() !== null
