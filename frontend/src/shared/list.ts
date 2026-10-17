/**
 * Copia di `list` in cui l'elemento `index` si scambia con quello a distanza `delta`
 * (-1 sale, +1 scende). Se lo spostamento uscirebbe dalla lista, la restituisce invariata.
 */
export function moveItem<T>(list: T[], index: number, delta: number): T[] {
  const target = index + delta
  if (target < 0 || target >= list.length) return list
  const next = [...list]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}
