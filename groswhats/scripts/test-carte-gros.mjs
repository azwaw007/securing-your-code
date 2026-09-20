/**
 * Vérifie la Carte sur l’accueil gros (et absente en détail).
 * Usage: node scripts/test-carte-gros.mjs
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

const BASE = process.env.AZ_POS_URL || 'http://127.0.0.1:5173'
const OUT = '/opt/cursor/artifacts'
mkdirSync(OUT, { recursive: true })

function seedState(mode, domainId) {
  const locId = 'loc_main'
  return {
    settings: {
      shopName: mode === 'gros' ? 'Depot Gros Test' : 'Boutique Detail',
      phone: '0555123456',
      city: 'Alger',
      language: 'fr',
      setupDone: true,
      countryCode: 'DZ',
      commerceMode: mode,
      domainId,
      currency: 'DA',
      nextInvoiceNumber: 1,
      stockAlertsEnabled: true,
      uiSoundsEnabled: false,
      easyMode: true,
      themePreset: 'forest',
      fontScale: 'normal',
      showZakat: true,
      showCalculator: true,
      showGallery: true,
      multiLocationEnabled: false,
      activeLocationId: locId,
    },
    locations: [{ id: locId, name: 'Magasin principal' }],
    products: [],
    clients: [
      {
        id: 'c1',
        name: 'Magasin Bab Ezzouar',
        phone: '0555000001',
        city: 'Alger',
        address: 'Centre commercial',
        notes: '',
        lat: 36.716,
        lng: 3.185,
        createdAt: new Date().toISOString(),
      },
    ],
    orders: [],
    incomingOrders: [],
    zakatHistory: [],
    expenses: [],
    cashEntries: [],
    drivers: [],
    missions: [],
    team: {
      companyCode: 'TEST01',
      role: 'owner',
      currentDriverId: null,
      syncSecret: 'SECRET01',
      multiPosteEnabled: false,
      hasChosenRole: true,
    },
    purchases: [],
    suppliers: [],
    returns: [],
    heldSales: [],
    staff: [],
    medicalDocs: [],
    athleteProfiles: [],
    specialtyProfiles: {},
    clinicAgenda: [],
    tables: [],
    repairOrders: [],
  }
}

async function shot(page, name) {
  const path = `${OUT}/${name}`
  await page.screenshot({ path, fullPage: false })
  console.log('SHOT', path)
  return path
}

async function loadMode(page, mode, domainId) {
  await page.goto(BASE, { waitUntil: 'networkidle' })
  const state = seedState(mode, domainId)
  await page.evaluate((s) => {
    localStorage.setItem('az-pos-v1', JSON.stringify(s))
  }, state)
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 420, height: 900 } })
  const log = []
  const ok = (name, cond, detail = '') => {
    const line = `${cond ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`
    log.push(line)
    console.log(line)
  }

  // —— GROS (sans produits : grille doit quand même montrer Carte) ——
  await loadMode(page, 'gros', 'gros-alimentaire')
  await page.evaluate(() => window.scrollTo(0, 600))
  await page.waitForTimeout(300)
  await shot(page, 'carte-gros-home.png')

  const carteBtn = page.locator('.app-tile', { hasText: /Carte/i }).first()
  const carteVisible = await carteBtn.isVisible().catch(() => false)
  ok('gros: Carte visible sur grille (même sans stock)', carteVisible)

  if (carteVisible) {
    await carteBtn.click()
    await page.waitForTimeout(1200)
    await shot(page, 'carte-gros-map.png')
    const mapCanvas = await page.locator('.gmaps-canvas, .leaflet-container').count()
    ok('gros: page carte ouverte (leaflet)', mapCanvas > 0)
  }

  // —— DETAIL ——
  await loadMode(page, 'detail', 'detail-superette')
  await page.evaluate(() => window.scrollTo(0, 600))
  await page.waitForTimeout(300)
  await shot(page, 'carte-detail-home.png')
  const appTiles = await page.locator('.app-grid .app-tile .app-label').allTextContents()
  const hasCarteTile = appTiles.some((t) => /\bCarte\b/i.test(t))
  ok('detail: pas de Carte sur grille', !hasCarteTile, `labels=${JSON.stringify(appTiles)}`)

  console.log('---')
  console.log(log.every((l) => l.startsWith('PASS')) ? 'ALL PASS' : 'SOME FAIL')
  await browser.close()
  process.exit(log.every((l) => l.startsWith('PASS')) ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
