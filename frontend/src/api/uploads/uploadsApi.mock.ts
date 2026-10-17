// Nel mock le immagini diventano data URL salvati in localStorage: vanno ridimensionate e compresse,
// altrimenti poche foto da telefono esaurirebbero lo spazio disponibile.
import { simulate } from '../mock/storage'
import { ApiError, requestLimits } from '../types'
import { checkImage, shrinkImage } from './shrinkImage'
import type { UploadsApi } from './uploadsApi'

/** Dimensione in byte del contenuto di un data URL base64. */
const dataUrlBytes = (url: string) => Math.ceil((url.length - url.indexOf(',') - 1) * 3 / 4)

export const uploadsApiMock: UploadsApi = {
  async uploadImage(file) {
    checkImage(file)
    const url = (await shrinkImage(file)).toDataURL('image/jpeg', 0.8)
    if (dataUrlBytes(url) > requestLimits.maxImageBytes) throw new ApiError(413, '“' + file.name + '” è troppo pesante anche dopo la compressione.')
    return simulate(() => ({ url }))
  },
}
