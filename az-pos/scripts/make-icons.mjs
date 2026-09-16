/**
 * Génère icon-192.png et icon-512.png pour PWA / Android / Electron.
 * Usage: node scripts/make-icons.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'
import { createHash } from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'public', 'icons')
mkdirSync(outDir, { recursive: true })

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

/** PNG uni vert marque + texte approximatif via bande blanche (icône simple) */
function makePng(size) {
  const rows = []
  const r = 15
  const g = 107
  const b = 76
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3)
    row[0] = 0
    for (let x = 0; x < size; x++) {
      const i = 1 + x * 3
      // bande claire centrale pour “logo”
      const cx = x / size
      const cy = y / size
      const inBadge =
        cx > 0.18 && cx < 0.82 && cy > 0.22 && cy < 0.78
      if (inBadge && cy > 0.35 && cy < 0.55) {
        row[i] = 255
        row[i + 1] = 255
        row[i + 2] = 255
      } else if (inBadge && cy > 0.58 && cy < 0.7) {
        row[i] = 184
        row[i + 1] = 240
        row[i + 2] = 216
      } else {
        row[i] = r
        row[i + 1] = g
        row[i + 2] = b
      }
    }
    rows.push(row)
  }
  const raw = Buffer.concat(rows)
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

for (const size of [192, 512]) {
  const file = join(outDir, `icon-${size}.png`)
  writeFileSync(file, makePng(size))
  const hash = createHash('sha1').update(makePng(size)).digest('hex').slice(0, 8)
  console.log('wrote', file, hash)
}
