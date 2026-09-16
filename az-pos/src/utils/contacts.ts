import type { Client } from '../types'

type ContactLike = { name?: string[]; tel?: string[] }

export async function pickPhoneContacts(): Promise<
  Array<Pick<Client, 'name' | 'phone'>>
> {
  const nav = navigator as Navigator & {
    contacts?: {
      select: (
        props: string[],
        options?: { multiple?: boolean },
      ) => Promise<ContactLike[]>
    }
  }

  if (!nav.contacts?.select) {
    throw new Error('contacts_unsupported')
  }

  const selected = await nav.contacts.select(['name', 'tel'], { multiple: true })
  return selected
    .map((c) => ({
      name: (c.name?.[0] ?? '').trim() || 'Client',
      phone: (c.tel?.[0] ?? '').replace(/\s/g, ''),
    }))
    .filter((c) => c.phone.length >= 8)
}

/** Colle une liste WhatsApp / carnet : une ligne = Nom,0555... ou Nom;0555... */
export function parseContactLines(text: string): Array<Pick<Client, 'name' | 'phone'>> {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/[,;\t|]/).map((p) => p.trim())
      if (parts.length >= 2) {
        const phone = parts.find((p) => /\d{8,}/.test(p.replace(/\D/g, ''))) ?? parts[1]
        const name = parts.find((p) => p !== phone) ?? 'Client'
        return { name, phone: phone.replace(/\s/g, '') }
      }
      if (/^\+?\d[\d\s-]{7,}$/.test(line)) {
        return { name: line, phone: line.replace(/\s/g, '') }
      }
      return null
    })
    .filter((c): c is Pick<Client, 'name' | 'phone'> => !!c && c.phone.length >= 8)
}
