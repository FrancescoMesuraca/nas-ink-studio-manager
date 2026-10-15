// Nel mock le immagini diventano data URL salvati in localStorage: vanno ridimensionate e compresse,
// altrimenti poche foto da telefono esaurirebbero lo spazio disponibile.
import { simulate } from '../mock/storage'
import { ApiError, requestLimits } from '../types'
import type { UploadsApi } from './uploadsApi'

const accepted = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const maxSide = 1280

async function shrink(file: File): Promise<string> {
  let bitmap: ImageBitmap
  try { bitmap = await createImageBitmap(file) } catch { throw new ApiError(400, 'Non riesco a leggere questa immagine: usa un file JPG, PNG o WebP.') }
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const context = canvas.getContext('2d')
  if (!context) throw new ApiError(500, 'Il browser non permette di elaborare l’immagine.')
  context.fillStyle = '#fff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', 0.8)
}

/** Dimensione in byte del contenuto di un data URL base64. */
const dataUrlBytes = (url: string) => Math.ceil((url.length - url.indexOf(',') - 1) * 3 / 4)

export const uploadsApiMock: UploadsApi = {
  async uploadImage(file) {
    if (!accepted.includes(file.type)) throw new ApiError(400, '“' + file.name + '” non è un formato supportato: usa JPG, PNG o WebP.')
    if (file.size > 15 * 1024 * 1024) throw new ApiError(413, '“' + file.name + '” è troppo grande (massimo 15 MB).')
    const url = await shrink(file)
    if (dataUrlBytes(url) > requestLimits.maxImageBytes) throw new ApiError(413, '“' + file.name + '” è troppo pesante anche dopo la compressione.')
    return simulate(() => ({ url }))
  },
}
