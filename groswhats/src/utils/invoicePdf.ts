/** Rendu PDF → images (pages) pour OCR facture, côté navigateur. */

import type { PDFDocumentProxy } from 'pdfjs-dist'

const MAX_PAGES = 8
const TARGET_WIDTH = 1600

let workerReady = false

async function loadPdfjs() {
  const pdfjs = await import('pdfjs-dist')
  if (!workerReady) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url,
    ).toString()
    workerReady = true
  }
  return pdfjs
}

async function pageToPngBlob(
  pdf: PDFDocumentProxy,
  pageNum: number,
): Promise<Blob> {
  const page = await pdf.getPage(pageNum)
  const unscaled = page.getViewport({ scale: 1 })
  const scale = Math.min(2.2, TARGET_WIDTH / unscaled.width)
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas')
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  await page.render({ canvasContext: ctx, viewport }).promise
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('blob'))),
      'image/png',
    )
  })
}

/** Convertit un PDF en blobs image (une par page, max 8). */
export async function renderPdfPagesToImages(
  file: File | Blob,
  onProgress?: (pct: number) => void,
): Promise<Blob[]> {
  const pdfjs = await loadPdfjs()
  const data = new Uint8Array(await file.arrayBuffer())
  const pdf = await pdfjs.getDocument({ data }).promise
  const n = Math.min(pdf.numPages, MAX_PAGES)
  const out: Blob[] = []
  for (let i = 1; i <= n; i++) {
    out.push(await pageToPngBlob(pdf, i))
    onProgress?.(Math.round((i / n) * 100))
  }
  return out
}

export function isPdfFile(file: File): boolean {
  const n = file.name.toLowerCase()
  return file.type === 'application/pdf' || n.endsWith('.pdf')
}
