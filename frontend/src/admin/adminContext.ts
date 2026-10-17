import { useOutletContext } from 'react-router'
import type { StudioData } from '../api'

/** Esegue un'operazione che restituisce lo stato aggiornato; in caso di errore lo mostra nel banner. */
export type Runner = (task: () => Promise<StudioData>) => Promise<boolean>

export const emptyRequestDraft = { name: '', contact: '', description: '', bodyArea: '', size: '', style: '', references: '' }
export type RequestDraft = typeof emptyRequestDraft

/** Stato condiviso dalle sezioni del gestionale (prima viveva in App.tsx). */
export type AdminContext = {
  data: StudioData
  run: Runner
  setError: (message: string) => void
  date: string
  setDate: (date: string) => void
  openRequest: (id: string) => void
  requestDraft: RequestDraft
  setRequestDraft: (draft: RequestDraft) => void
}

export const useAdmin = () => useOutletContext<AdminContext>()
