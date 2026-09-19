/** Accepte 100, x100, ×100, 12,5 */
export function parseQtyInput(raw: string): number | null {
  const cleaned = String(raw)
    .trim()
    .replace(',', '.')
    .replace(/^[x×*]\s*/i, '')
  if (!cleaned) return 0
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}
