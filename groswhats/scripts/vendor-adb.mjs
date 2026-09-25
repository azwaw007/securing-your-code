/**
 * Télécharge Google SDK Platform-Tools (Windows) → electron/vendor/adb-win/
 * Embarqué dans AZ POS.exe (extraResources) pour Google TV / ADB.
 */
import { createWriteStream, existsSync, mkdirSync, copyFileSync, rmSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { pipeline } from 'stream/promises'
import { createUnzip } from 'zlib'
import { execFileSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const outDir = join(root, 'electron', 'vendor', 'adb-win')
const zipUrl =
  'https://dl.google.com/android/repository/platform-tools-latest-windows.zip'
const zipPath = join(root, 'electron', 'vendor', 'platform-tools-win.zip')

const NEEDED = ['adb.exe', 'AdbWinApi.dll', 'AdbWinUsbApi.dll']

function hasAll() {
  return NEEDED.every((f) => existsSync(join(outDir, f)))
}

async function download(url, dest) {
  mkdirSync(dirname(dest), { recursive: true })
  const res = await fetch(url)
  if (!res.ok || !res.body) {
    throw new Error(`Download failed ${res.status} ${url}`)
  }
  await pipeline(res.body, createWriteStream(dest))
}

function extractWithPython(zip, dest) {
  mkdirSync(dest, { recursive: true })
  const tmp = join(dirname(dest), '_pt_extract')
  rmSync(tmp, { recursive: true, force: true })
  mkdirSync(tmp, { recursive: true })
  execFileSync(
    'python3',
    ['-c', `import zipfile,sys; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])`, zip, tmp],
    { stdio: 'inherit' },
  )
  const src = join(tmp, 'platform-tools')
  mkdirSync(dest, { recursive: true })
  for (const f of NEEDED) {
    const from = join(src, f)
    if (!existsSync(from)) throw new Error(`Manquant dans le zip: ${f}`)
    copyFileSync(from, join(dest, f))
  }
  rmSync(tmp, { recursive: true, force: true })
}

async function main() {
  if (hasAll()) {
    console.log('ADB Windows déjà présent:', outDir)
    return
  }
  console.log('Téléchargement Platform-Tools Windows…')
  await download(zipUrl, zipPath)
  console.log('Extraction adb.exe + DLL…')
  extractWithPython(zipPath, outDir)
  rmSync(zipPath, { force: true })
  if (!hasAll()) throw new Error('Extraction ADB incomplète')
  console.log('OK →', outDir)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
