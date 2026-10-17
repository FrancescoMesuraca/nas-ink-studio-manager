import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'
import { mockSettings } from '../api/mock/storage'

// I mock rispondono subito nei test; ogni test parte da dati demo puliti.
mockSettings.latency = 0

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  cleanup()
})

// API del browser che jsdom non implementa.
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
Element.prototype.scrollIntoView = vi.fn()
