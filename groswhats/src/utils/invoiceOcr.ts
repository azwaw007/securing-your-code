/** OCR facture via Tesseract (chargé à la demande). */

import type { Worker } from 'tesseract.js'

let workerPromise: Promise<Worker> | null = null
let progressCb: ((pct: number) => void) | null = null

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = await import('tesseract.js')
      return createWorker(['fra', 'eng'], 1, {
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
