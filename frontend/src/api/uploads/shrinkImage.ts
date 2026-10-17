// Controllo e ridimensionamento delle immagini nel browser, prima del caricamento (mock e backend vero):
// le foto da telefono pesano diversi MB, a noi bastano 1280 px sul lato lungo in JPEG.
import { ApiError } from '../types'

const accepted = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const maxSide = 1280

/** 400 se il formato non è supportato, 413 se il file originale è enorme. */
export function checkImage(file: File) {
  if (!accepted.includes(file.type)) throw new ApiError(400, '“' + file.name + '” non è un formato supportato: usa JPG, PNG o WebP.')
  if (file.size > 15 * 1024 * 1024) throw new ApiError(413, '“' + file.name + '” è troppo grande (massimo 15 MB).')
}

/** Disegna l'immagine ridotta su un canvas, con sfondo bianco al posto della trasparenza (diventa JPEG). */
export async function shrinkImage(file: File): Promise<HTMLCanvasElement> {
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
  return canvas
}

/** L'immagine ridotta come file JPEG, pronta per il multipart. */
export async function shrinkToJpegFile(file: File): Promise<File> {
  const canvas = await shrinkImage(file)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.8))
  if (!blob) throw new ApiError(500, 'Il browser non permette di elaborare l’immagine.')
  return new File([blob], file.name.replace(/\.[^.]*$/, '') + '.jpg', { type: 'image/jpeg' })
}
