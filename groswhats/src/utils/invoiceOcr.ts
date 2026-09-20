/** OCR facture via Tesseract — 100 % local (hors ligne magasin). */

import type { Worker } from 'tesseract.js'
import workerUrl from 'tesseract.js/dist/worker.min.js?url'
import coreUrl from 'tesseract.js-core/tesseract-core-simd-lstm.wasm.js?url'

let workerPromise: Promise<Worker> | null = null
let progressCb: ((pct: number) => void) | null = null

/** Dossier public/tessdata (PWA / APK / Electron), sans CDN. */
function tessdataPath(): string {
  const base = import.meta.env.BASE_URL || './'
  if (base === './' || base === '.' || base === '') return './tessdata'
  return `${base.replace(/\/?$/, '/')}tessdata`
}

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = await import('tesseract.js')
      return createWorker(['fra', 'eng', 'ara'], 1, {
        workerPath: workerUrl,
        corePath: coreUrl,
        langPath: tessdataPath(),
        gzip: false,
        logger: (m) => {
          if (
            m.status === 'recognizing text' &&
            typeof m.progress === 'number' &&
            progressCb
          ) {
            progressCb(Math.round(m.progress * 100))
          }
        },
      })
    })()
  }
  return workerPromise
}

export function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine !== false
}

async function loadBitmap(
  source: string | File | Blob,
): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof source === 'string') {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('img'))
      img.src = source
    })
    return img
  }
  try {
    return await createImageBitmap(source)
  } catch {
    const url = URL.createObjectURL(source)
    try {
      const img = new Image()
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('img'))
        img.src = url
      })
      return img
    } finally {
      URL.revokeObjectURL(url)
    }
  }
}

/**
 * Prétraitement local : agrandit les petites photos, niveaux de gris,
 * contraste — améliore Tesseract sur tickets / factures floues.
 */
export async function preprocessInvoiceImage(
  source: string | File | Blob,
): Promise<Blob> {
  const draw = await loadBitmap(source)
  const w =
    'naturalWidth' in draw
      ? draw.naturalWidth || draw.width
      : (draw as ImageBitmap).width
  const h =
    'naturalHeight' in draw
      ? draw.naturalHeight || draw.height
      : (draw as ImageBitmap).height

  // Cible ~1800px sur le grand côté (lisibilité OCR) sans exploser la mémoire
  const maxSide = 1800
  const minSide = 1200
  const long = Math.max(w, h)
  let scale = 1
  if (long < minSide) scale = minSide / long
  else if (long > maxSide) scale = maxSide / long

  const outW = Math.max(1, Math.round(w * scale))
  const outH = Math.max(1, Math.round(h * scale))
  const canvas = document.createElement('canvas')
  canvas.width = outW
  canvas.height = outH
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('canvas')

  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, outW, outH)
  ctx.drawImage(draw, 0, 0, outW, outH)
  if ('close' in draw && typeof (draw as ImageBitmap).close === 'function') {
    ;(draw as ImageBitmap).close()
  }

  const img = ctx.getImageData(0, 0, outW, outH)
  const d = img.data
  // Niveaux de gris + contraste doux (évite de brûler les tickets clairs)
  const contrast = 1.35
  const intercept = 128 * (1 - contrast)
  for (let i = 0; i < d.length; i += 4) {
    const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
    const v = Math.max(0, Math.min(255, g * contrast + intercept))
    // Seuil doux : texte plus noir, fond plus blanc
    const bin = v > 185 ? 255 : v < 90 ? 0 : v
    d[i] = d[i + 1] = d[i + 2] = bin
  }
  ctx.putImageData(img, 0, 0)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('blob'))),
      'image/png',
    )
  })
}

export async function ocrInvoiceImage(
  source: string | File | Blob,
  onProgress?: (pct: number) => void,
): Promise<string> {
  progressCb = onProgress ?? null
  try {
    const worker = await getWorker()
    let input: string | File | Blob = source
    try {
      input = await preprocessInvoiceImage(source)
      // Prétraitement = ~5 % du progrès perçu
      onProgress?.(5)
    } catch {
      input = source
    }
    const result = await worker.recognize(input)
    return (result.data.text || '').trim()
  } finally {
    progressCb = null
  }
}

export async function terminateInvoiceOcr(): Promise<void> {
  if (!workerPromise) return
  try {
    const w = await workerPromise
    await w.terminate()
  } catch {
    /* ignore */
  }
  workerPromise = null
}
