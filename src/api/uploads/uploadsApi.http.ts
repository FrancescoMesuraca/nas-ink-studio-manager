// Stub HTTP degli upload.
//
//   POST /uploads   multipart/form-data, campo `file` → { url }
//        pubblico per le immagini di riferimento del modulo (con limiti di dimensione e rate limit),
//        il backend salva su storage di oggetti e restituisce un URL stabile.
import { http } from '../client'
import type { UploadsApi } from './uploadsApi'

export const uploadsApiHttp: UploadsApi = {
  uploadImage(file) {
    const body = new FormData()
    body.append('file', file)
    return http<{ url: string }>('POST', '/uploads', body)
  },
}
