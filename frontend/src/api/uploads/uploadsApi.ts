/** Caricamento immagini (riferimenti delle richieste, foto del sito). */
export interface UploadsApi {
  /**
   * Restituisce l'URL pubblico dell'immagine caricata.
   * 400 se il formato non è supportato, 413 se è troppo grande anche dopo il ridimensionamento.
   */
  uploadImage(file: File): Promise<{ url: string }>
}
