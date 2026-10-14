import { timeRangeError } from '../../services/bookingRules.js'
import { artistBusy, loadStudio, saveStudio } from '../mock/studioStore'
import { simulate, uid } from '../mock/storage'
import { ApiError, type CustomerRequest, type StudioData } from '../types'
import type { RequestsApi } from './requestsApi'

const change = (next: (data: StudioData) => StudioData) => simulate(() => saveStudio(next(loadStudio())))
const fail = (status: number, message: string): never => { throw new ApiError(status, message) }
const emptyConsultation = { notes: '', subject: '', composition: '', style: '', position: '', size: '', colors: '', imageUrl: '' }
const updateRequest = (data: StudioData, id: string, fields: Partial<CustomerRequest>) =>
  ({ ...data, requests: data.requests.map((request) => request.id === id ? { ...request, ...fields } : request) })

export const requestsApiMock: RequestsApi = {
  create: (input) => simulate(() => {
    const data = loadStudio()
    const request: CustomerRequest = { ...input, id: uid(), status: 'nuova', consultation: { ...emptyConsultation } }
    saveStudio({ ...data, requests: [...data.requests, request] })
    return request
  }),
  setStatus: (id, status) => change((data) => updateRequest(data, id, { status })),
  saveConsultation: (id, consultation) => change((data) => updateRequest(data, id, { consultation })),
  proposeConsultation: (id, slot) => change((data) => {
    if (!data.requests.some((item) => item.id === id)) fail(404, 'Scheda cliente non trovata.')
    if (!data.artists.some((artist) => artist.id === slot.artistId)) fail(400, 'Tatuatore non valido.')
    const error = timeRangeError(slot, data.hours)
    if (error) fail(400, error)
    if (artistBusy(data, { ...slot, status: 'proposta' }, id)) fail(409, 'Il tatuatore è occupato in questa fascia oraria.')
    return updateRequest(data, id, { consultationSlot: { ...slot, status: 'proposta' } })
  }),
  confirmConsultation: (id) => change((data) => {
    const slot = data.requests.find((item) => item.id === id)?.consultationSlot
    if (!slot || slot.status !== 'proposta') return fail(409, 'Non c’è una proposta da confermare.')
    if (artistBusy(data, slot, id)) fail(409, 'Il tatuatore è occupato in questa fascia oraria.')
    return updateRequest(data, id, { status: 'consulenza', consultationSlot: { ...slot, status: 'confermata' } })
  }),
  cancelConsultation: (id) => change((data) => updateRequest(data, id, { consultationSlot: undefined })),
}
