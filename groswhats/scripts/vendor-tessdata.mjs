#!/usr/bin/env node
/**
 * Télécharge tessdata_fast (fra+eng) dans public/tessdata pour OCR hors ligne.
 * Nécessite internet une fois (build / machine de dev) — pas en magasin.
 */
import { createWriteStream } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { pipeline } from 'node:stream/promises'
import { Readable } from 'node:stream'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../public/tessdata',
)

const files = {
  'eng.traineddata':
    'https://github.com/tesseract-ocr/tessdata_fast/raw/main/eng.traineddata',
  'fra.traineddata':
    'https://github.com/tesseract-ocr/tessdata_fast/raw/main/fra.traineddata',
}

await mkdir(dir, { recursive: true })
for (const [name, url] of Object.entries(files)) {
  const dest = path.join(dir, name)
  console.log('→', name)
  const res = await fetch(url)
  if (!res.ok || !res.body) throw new Error(`${url} → ${res.status}`)
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest))
}
console.log('OK', dir)
