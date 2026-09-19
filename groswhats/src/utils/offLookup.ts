/** Lookup Open Food Facts — index local catalog/off + API (CORS ok). */

import type { ProductCategory } from '../types'
import { productImageSrc } from './productArt'

export type OffLookupHit = {
  barcode: string
  name: string
  brands?: string
  category: ProductCategory
  /** `catalog/off/EAN.jpg` ou URL https OFF */
  imageDataUrl?: string
  source: 'local' | 'api'
}

type OffIndexEntry = {
  name: string
  file?: string
  brands?: string
  category?: ProductCategory
}

type OffIndexFile = {
  products?: Record<string, OffIndexEntry>
}

const OFF_UA = 'AZPOS/1.0 (https://az-pos-dz.vercel.app)'
const OFF_API = 'https://world.openfoodfacts.org/api/v2/product'

let indexCache: Record<string, OffIndexEntry> | null = null
let indexPromise: Promise<Record<string, OffIndexEntry>> | null = null

export function normalizeBarcode(code: string): string {
  return code.trim().replace(/\s+/g, '')
}

/** EAN / UPC / codes numériques courants en rayon. */
export function looksLikeProductBarcode(code: string): boolean {
  const c = normalizeBarcode(code)
  return /^[0-9]{8,14}$/.test(c)
}

function guessCategory(tags: string[] | undefined): ProductCategory {
  const joined = (tags || []).join(' ').toLowerCase()
  if (
    /cosmetic|hygiene|shampoo|soap|deodorant|toothpaste|en:body-care/.test(
      joined,
    )
  ) {
    return 'cosmetique'
  }
  return 'alimentaire'
}

async function loadLocalIndex(): Promise<Record<string, OffIndexEntry>> {
  if (indexCache) return indexCache
  if (indexPromise) return indexPromise

  indexPromise = (async () => {
    const base = import.meta.env.BASE_URL || './'
    try {
      const res = await fetch(`${base}catalog/off/index.json`, {
        headers: { Accept: 'application/json' },
      })
      if (!res.ok) {
        indexCache = {}
        return indexCache
      }
      const data = (await res.json()) as OffIndexFile
      indexCache = data.products || {}
      return indexCache
    } catch {
      indexCache = {}
      return indexCache
    }
  })()

  return indexPromise
}

/** Vérifie si une image locale existe (après sync script OFF). */
async function probeLocalImage(code: string): Promise<string | null> {
  const exts = ['.jpg', '.jpeg', '.png', '.webp']
  for (const ext of exts) {
    const rel = `catalog/off/${code}${ext}`
    const url = productImageSrc(rel)
    if (!url) continue
    try {
      const res = await fetch(url, { method: 'HEAD' })
      if (res.ok) return rel
    } catch {
      /* ignore */
    }
  }
  return null
}

async function fetchOffApi(
  code: string,
  signal?: AbortSignal,
): Promise<OffLookupHit | null> {
  try {
    const res = await fetch(`${OFF_API}/${encodeURIComponent(code)}.json`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': OFF_UA,
      },
      signal,
    })
    if (!res.ok) return null
    const data = (await res.json()) as {
      status?: number
      product?: Record<string, unknown>
    }
    if (data.status !== 1 || !data.product) return null

    const p = data.product
    const name = String(
      p.product_name_fr ||
        p.product_name ||
        p.product_name_ar ||
        p.generic_name ||
        p.brands ||
        '',
    ).trim()
    if (!name) return null

    const image = String(
      p.image_front_small_url ||
        p.image_small_url ||
        p.image_front_url ||
        p.image_url ||
        '',
    ).trim()

    return {
      barcode: code,
      name,
      brands: String(p.brands || '').trim() || undefined,
      category: guessCategory(p.categories_tags as string[] | undefined),
      imageDataUrl: image.startsWith('http') ? image : undefined,
      source: 'api',
    }
  } catch {
    return null
  }
}

/**
 * Résout un code-barres : index local + image `catalog/off/`,
 * sinon API Open Food Facts (online).
 */
export async function lookupOffProduct(
  barcode: string,
  signal?: AbortSignal,
): Promise<OffLookupHit | null> {
  const code = normalizeBarcode(barcode)
  if (!looksLikeProductBarcode(code)) return null

  const index = await loadLocalIndex()
  const local = index[code]
  const localImg = local?.file
    ? `catalog/off/${local.file.replace(/^.*\//, '')}`
    : await probeLocalImage(code)

  if (local?.name && (localImg || local.file)) {
    const file = localImg || (local.file ? `catalog/off/${local.file}` : undefined)
    return {
      barcode: code,
      name: local.name,
      brands: local.brands,
      category: local.category || 'alimentaire',
      imageDataUrl: file,
      source: 'local',
    }
  }

  const api = await fetchOffApi(code, signal)
  if (!api) {
    if (local?.name) {
      return {
        barcode: code,
        name: local.name,
        brands: local.brands,
        category: local.category || 'alimentaire',
        imageDataUrl: localImg || undefined,
        source: 'local',
      }
    }
    return null
  }

  if (localImg) {
    return { ...api, imageDataUrl: localImg, source: 'local' }
  }
  return api
}
