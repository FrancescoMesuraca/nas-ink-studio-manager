import { describe, expect, it } from 'vitest'
import { freeTimes } from './freeTimes'

const hours = { start: '09:00', end: '19:00' }

describe('freeTimes', () => {
  it('senza impegni è libera tutta la giornata', () => {
    expect(freeTimes(hours, [])).toEqual(['09:00–19:00'])
  })

  it('restituisce i buchi tra gli impegni, anche se non sono in ordine', () => {
    expect(freeTimes(hours, [{ start: '14:00', end: '15:00' }, { start: '10:00', end: '11:00' }]))
      .toEqual(['09:00–10:00', '11:00–14:00', '15:00–19:00'])
  })

  it('gestisce impegni sovrapposti e attaccati agli orari di apertura', () => {
    expect(freeTimes(hours, [{ start: '09:00', end: '12:00' }, { start: '11:00', end: '13:00' }, { start: '18:00', end: '19:00' }]))
      .toEqual(['13:00–18:00'])
  })
})
