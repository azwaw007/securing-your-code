export function formatDa(amount: number): string {
  return `${Math.round(amount).toLocaleString('fr-DZ')} DA`
}

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('0') && digits.length === 10) {
    return `213${digits.slice(1)}`
  }
  if (digits.startsWith('213')) return digits
  return digits
}

export function formatQty(qty: number): string {
  return Number.isInteger(qty) ? String(qty) : qty.toFixed(2).replace(/\.?0+$/, '')
}
