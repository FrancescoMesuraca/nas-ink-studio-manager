import type { Consultation, ConsultationSlot, CustomerRequest, NewRequestInput, RequestStatus, StudioData } from '../types'

/**
 * Richieste dei clienti. `create` è l'unico punto di ingresso, sia per il modulo pubblico del sito
 * sia per l'inserimento dal gestionale: la richiesta nasce sempre con stato `nuova`.
 * Le altre operazioni sono del gestionale e restituiscono lo stato aggiornato completo,
 * perché le consulenze occupano l'agenda dei tatuatori.
 */
export interface RequestsApi {
  create(input: NewRequestInput): Promise<CustomerRequest>
  setStatus(id: string, status: RequestStatus): Promise<StudioData>
  saveConsultation(id: string, consultation: Consultation): Promise<StudioData>
  proposeConsultation(id: string, slot: Omit<ConsultationSlot, 'status'>): Promise<StudioData>
  /** Demo: simula la conferma del cliente alla fascia proposta. */
  confirmConsultation(id: string): Promise<StudioData>
  cancelConsultation(id: string): Promise<StudioData>
}
