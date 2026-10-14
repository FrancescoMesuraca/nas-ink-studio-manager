// Unico punto di accesso alle API per le pagine: non sanno se sotto c'è il mock o il backend vero.
import { isMockMode } from './config'
import { requestsApiHttp } from './requests/requestsApi.http'
import { requestsApiMock } from './requests/requestsApi.mock'
import { studioApiHttp } from './studio/studioApi.http'
import { studioApiMock } from './studio/studioApi.mock'

export { isMockMode } from './config'
export * from './types'
export type { RequestsApi } from './requests/requestsApi'
export type { StudioApi } from './studio/studioApi'

export const studioApi = isMockMode ? studioApiMock : studioApiHttp
export const requestsApi = isMockMode ? requestsApiMock : requestsApiHttp
