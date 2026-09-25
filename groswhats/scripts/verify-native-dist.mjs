#!/usr/bin/env node
/**
 * Refuse de packager un dist web (chemins /assets) dans l’EXE Electron.
 * Les builds native doivent utiliser base: './' (NATIVE=1).
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const indexPath = resolve(root, 'dist', 'index.html')

if (!existsSync(indexPath)) {
  console.error('verify-native-dist: dist/index.html manquant — lance npm run build:native')
  process.exit(1)
}

const html = readFileSync(indexPath, 'utf8')
const badAbs = /(?:src|href)=["']\/(?:assets|registerSW|manifest)/i.test(html)
const hasRel = /(?:src|href)=["']\.\/assets\//i.test(html)

if (badAbs || !hasRel) {
  console.error(
    'verify-native-dist: dist utilise des chemins absolus (ex. /assets/...).',
  )
  console.error(
    'L’EXE charge via file:// → écran noir. Rebuild avec: npm run build:native',
  )
  process.exit(1)
}

console.log('verify-native-dist: OK (chemins relatifs ./assets)')
