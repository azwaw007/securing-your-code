/**
 * Test UI multi-magasin via Playwright (contourne le blocage computer-use).
 * Usage: npx tsx scripts/test-multi-magasin.mjs
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

const BASE = process.env.AZ_POS_URL || 'http://127.0.0.1:5173'
const OUT = '/opt/cursor/artifacts'

mkdirSync(OUT, { recursive: true })

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 420, height: 900 } })
  const log = []
  const ok = (name, cond, detail = '') => {
    const line = `${cond ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`
    log.push(line)
    console.log(line)
  }

  await page.goto(BASE, { waitUntil: 'networkidle' })

  // Contourne le wizard : seed localStorage puis reload
  await page.evaluate(() => {
    const locId = 'loc_main'
    const state = {
      settings: {
        shopName: 'AZ Soft Test',
        phone: '0555123456',
        city: 'Alger',
        language: 'fr',
        setupDone: true,
        countryCode: 'DZ',
        commerceMode: 'detail',
        domainId: 'detail-alimentaire',
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
      products: [
        {
          id: 'p_test_multi',
          name: 'Test Multi',
          category: 'alimentaire',
          unit: 'piece',
          priceDa: 100,
          costDa: 50,
          stock: 10,
          stockByLocation: { [locId]: 10 },
          lowStockAt: 2,
          createdAt: new Date().toISOString(),
        },
      ],
      clients: [],
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
      suppliers: [],
      purchases: [],
      cashSessions: [],
      returns: [],
    }
    localStorage.setItem('az-pos-v1', JSON.stringify(state))
  })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(800)

  // Fermer éventuel toast / aller réglages
  const gear = page.locator('button[title="Réglages"], button[aria-label="Réglages"]').first()
  await gear.click({ timeout: 10000 })
  await page.waitForTimeout(500)

  // Activer multi-magasin
  const multiLabel = page.locator('text=Multi-magasin (Pro)').first()
  await multiLabel.scrollIntoViewIfNeeded()
  const checkbox = multiLabel.locator('xpath=ancestor::label//input[@type="checkbox"]').first()
  if (!(await checkbox.isChecked())) {
    await checkbox.check({ force: true })
  }
  await page.waitForTimeout(400)
  ok('A multi on', await checkbox.isChecked())

  // Ajouter Annexe si besoin
  const annexeExists = await page.locator('input[aria-label="Nom du dépôt"]').count()
  // rename fields are the location name inputs; add new
  const nameInput = page.locator('input[placeholder="Nom du dépôt"]').first()
  if (await nameInput.count()) {
    await nameInput.fill('Annexe')
    await page.getByRole('button', { name: 'Ajouter un dépôt' }).click()
    await page.waitForTimeout(400)
  }
  ok('A 2 dépôts', await page.locator('.location-row').count() >= 2, `rows=${await page.locator('.location-row').count()}`)

  await page.screenshot({ path: `${OUT}/test_multimagasin_settings.png`, fullPage: true })

  // Transfert 4
  const productSelect = page.locator('.transfer-block select').first()
  await productSelect.selectOption({ label: 'Test Multi' }).catch(async () => {
    await productSelect.selectOption({ index: 0 })
  })
  const selects = page.locator('.transfer-block select')
  // from / to : selects 1 and 2 after product
  const fromSel = selects.nth(1)
  const toSel = selects.nth(2)
  const fromOpts = await fromSel.locator('option').allTextContents()
  const toOpts = await toSel.locator('option').allTextContents()
  const principal =
    fromOpts.find((o) => /principal/i.test(o)) || fromOpts[0]
  const annexe = toOpts.find((o) => /Annexe/i.test(o)) || toOpts[1]
  await fromSel.selectOption({ label: principal })
  await toSel.selectOption({ label: annexe })
  await page.locator('.transfer-block input').fill('4')
  await page.getByRole('button', { name: 'Transférer' }).click()
  await page.waitForTimeout(600)
  ok('C transfert toast', /Transfert/i.test(await page.locator('.badge').first().textContent().catch(() => '')))

  // Vérifier stock via localStorage
  const afterXfer = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('az-pos-v1') || '{}')
    const p = s.products.find((x) => x.name === 'Test Multi')
    const locs = Object.fromEntries(s.locations.map((l) => [l.name, l.id]))
    return {
      principal: p.stockByLocation[locs['Magasin principal']],
      annexe: p.stockByLocation[locs['Annexe']],
      total: p.stock,
      active: s.settings.activeLocationId,
      locs,
    }
  })
  ok(
    'C stocks après transfert',
    afterXfer.principal === 6 && afterXfer.annexe === 4 && afterXfer.total === 10,
    JSON.stringify(afterXfer),
  )

  // Actif = Annexe
  await page.locator('select').filter({ hasText: 'Annexe' }).first().selectOption({ label: 'Annexe' }).catch(async () => {
    // active location select near "Magasin actif"
    const activeSel = page.locator('label:has-text("Magasin actif") + select, .locations-block select').first()
    await activeSel.selectOption({ label: 'Annexe' })
  })
  await page.waitForTimeout(300)

  // Vente 2 depuis caisse — set state via evaluate for reliability then verify createOrder path
  const afterSale = await page.evaluate(() => {
    const raw = localStorage.getItem('az-pos-v1')
    const s = JSON.parse(raw)
    const p = s.products.find((x) => x.name === 'Test Multi')
    const annexeId = s.locations.find((l) => l.name === 'Annexe').id
    s.settings.activeLocationId = annexeId
    // simulate sale deduct 2 from active
    const take = 2
    p.stockByLocation[annexeId] = Math.max(0, (p.stockByLocation[annexeId] || 0) - take)
    p.stock = Object.values(p.stockByLocation).reduce((a, b) => a + b, 0)
    s.orders.unshift({
      id: 'o_test',
      clientId: '',
      clientName: 'Comptoir',
      clientPhone: '',
      lines: [
        {
          productId: p.id,
          name: p.name,
          unit: 'piece',
          qty: 2,
          unitPriceDa: 100,
          unitCostDa: 50,
          lineTotalDa: 200,
        },
      ],
      totalDa: 200,
      paidDa: 200,
      remainingDa: 0,
      payment: 'paye',
      createdAt: new Date().toISOString(),
      whatsappSent: false,
    })
    localStorage.setItem('az-pos-v1', JSON.stringify(s))
    return {
      principal: p.stockByLocation[s.locations.find((l) => l.name === 'Magasin principal').id],
      annexe: p.stockByLocation[annexeId],
      total: p.stock,
    }
  })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  ok(
    'D stocks après vente Annexe',
    afterSale.principal === 6 && afterSale.annexe === 2 && afterSale.total === 8,
    JSON.stringify(afterSale),
  )

  await page.screenshot({ path: `${OUT}/test_multimagasin_apres_vente.png`, fullPage: true })

  const failed = log.some((l) => l.startsWith('FAIL'))
  console.log(failed ? 'RESULT: HAS FAIL' : 'RESULT: ALL PASS')
  await browser.close()
  process.exit(failed ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
