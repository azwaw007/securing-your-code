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
      return createWorker(['fra', 'eng'], 1, {
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

export async function ocrInvoiceImage(
  source: string | File | Blob,
  onProgress?: (pct: number) => void,
): Promise<string> {
  progressCb = onProgress ?? null
  try {
    const worker = await getWorker()
    const result = await worker.recognize(source)
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
