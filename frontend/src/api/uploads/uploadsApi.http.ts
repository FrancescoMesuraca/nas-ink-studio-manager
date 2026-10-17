// Upload verso il backend.
//
//   POST /uploads   multipart/form-data, campo `file` → { url }
//        pubblico per le immagini di riferimento del modulo (con limiti di dimensione e rate limit);
//        il backend salva il file e restituisce un URL assoluto e stabile.
// L'immagine viene ridotta nel browser prima dell'invio, come nel mock.
import { http } from '../client'
import { checkImage, shrinkToJpegFile } from './shrinkImage'
import type { UploadsApi } from './uploadsApi'

export const uploadsApiHttp: UploadsApi = {
  async uploadImage(file) {
    checkImage(file)
    const body = new FormData()
    body.append('file', await shrinkToJpegFile(file))
    return http<{ url: string }>('POST', '/uploads', body)
  },
}
