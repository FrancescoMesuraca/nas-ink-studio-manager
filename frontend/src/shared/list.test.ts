import { describe, expect, it } from 'vitest'
import { moveItem } from './list'

describe('moveItem', () => {
  it('scambia l’elemento con il vicino', () => {
    expect(moveItem(['a', 'b', 'c'], 1, -1)).toEqual(['b', 'a', 'c'])
    expect(moveItem(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'c', 'b'])
  })

  it('non modifica la lista originale', () => {
    const list = ['a', 'b']
    moveItem(list, 0, 1)
    expect(list).toEqual(['a', 'b'])
  })

  it('ai bordi restituisce la lista invariata', () => {
    const list = ['a', 'b']
    expect(moveItem(list, 0, -1)).toBe(list)
    expect(moveItem(list, 1, 1)).toBe(list)
  })
})
