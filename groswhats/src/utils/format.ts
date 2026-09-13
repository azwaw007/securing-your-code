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

/** Affiche 0555 12 34 56 pendant la saisie (indicatif 213 → 0). */
export function formatDzPhoneInput(raw: string): string {
  let digits = raw.replace(/\D/g, '')
  if (digits.startsWith('213')) digits = `0${digits.slice(3)}`
  digits = digits.slice(0, 10)
  if (digits.length <= 4) return digits
  if (digits.length <= 6) return `${digits.slice(0, 4)} ${digits.slice(4)}`
  if (digits.length <= 8) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 6)} ${digits.slice(6)}`
  }
  return `${digits.slice(0, 4)} ${digits.slice(4, 6)} ${digits.slice(6, 8)} ${digits.slice(8)}`
}

export function formatQty(qty: number): string {
  return Number.isInteger(qty) ? String(qty) : qty.toFixed(2).replace(/\.?0+$/, '')
}
