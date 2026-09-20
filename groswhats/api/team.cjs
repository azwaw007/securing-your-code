/**
 * Sync équipe multi-poste (patron ↔ livreurs ↔ caissiers).
 * Stockage durable : Vercel Blob (BLOB_READ_WRITE_TOKEN).
 * Push = merge (ne pas écraser le progrès livreur ni les ventes).
 */

const { loadTeam, saveTeam, hasBlob } = require('./team-store.cjs')
const { mergeTeamPayload, recomputeMissionStatus } = require('./team-merge.cjs')

function keyOf(companyCode, syncSecret) {
  return `${String(companyCode || '')
    .trim()
    .toUpperCase()}::${String(syncSecret || '').trim()}`
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

function filterMissions(data, driverId) {
  if (!driverId || !data) return data
  return {
    ...data,
    missions: (data.missions || []).filter((m) => m.driverId === driverId),
  }
}

function publicDrivers(drivers) {
  return (drivers || []).map((d) => ({
    id: d.id,
    name: d.name,
    phone: d.phone,
    active: d.active !== false,
    createdAt: d.createdAt,
  }))
}

function publicCashiers(cashiers) {
  return (cashiers || []).map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    active: c.active !== false,
    createdAt: c.createdAt,
  }))
}

function stripProductCosts(products) {
  return (products || []).map((p) => {
    if (!p || typeof p !== 'object') return p
    const { costDa: _c, ...rest } = p
    return rest
  })
}

/** Livreur : missions filtrées, pas de boutique ni PIN. */
function sanitizeForDriver(data, driverId) {
  if (!data) return data
  const filtered = filterMissions(data, driverId)
  return {
    companyCode: filtered.companyCode,
    syncSecret: filtered.syncSecret,
    shopName: filtered.shopName,
    drivers: publicDrivers(filtered.drivers),
    cashiers: [],
    missions: filtered.missions || [],
    products: [],
    clients: [],
    orders: [],
    cashEntries: [],
    updatedAt: filtered.updatedAt,
  }
}

/** Caissier : boutique sans coûts d’achat ni PIN. */
function sanitizeForCashier(data) {
  if (!data) return data
  return {
    ...data,
    drivers: publicDrivers(data.drivers),
    cashiers: publicCashiers(data.cashiers),
    products: stripProductCosts(data.products),
    missions: data.missions || [],
  }
}

function asArray(v) {
  return Array.isArray(v) ? v : []
}

module.exports = async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  try {
    if (req.method === 'GET') {
      const companyCode = String(req.query.companyCode || '')
      const syncSecret = String(req.query.syncSecret || '')
      const driverId = String(req.query.driverId || '')
      const cashierId = String(req.query.cashierId || '')
      const k = keyOf(companyCode, syncSecret)
      if (!companyCode || !syncSecret) {
        res.status(400).json({ message: 'companyCode et syncSecret requis' })
        return
      }
      const { data, storage, warning } = await loadTeam(k)
      if (!data) {
        res.status(404).json({
          message: warning || 'Aucune donnée équipe pour ce code',
          storage: storage || (hasBlob() ? 'blob' : 'memory'),
        })
        return
      }
      let payload = data
      if (driverId) payload = sanitizeForDriver(data, driverId)
      else if (cashierId) payload = sanitizeForCashier(data)
      res.status(200).json({
        ...payload,
        storage,
        ...(warning ? { warning } : {}),
      })
      return
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
      const action = body.action || 'push'

      if (action === 'push') {
        const companyCode = String(body.companyCode || '')
          .trim()
          .toUpperCase()
        const syncSecret = String(body.syncSecret || '').trim()
        if (!companyCode || !syncSecret) {
          res.status(400).json({ message: 'companyCode et syncSecret requis' })
          return
        }
        const k = keyOf(companyCode, syncSecret)
        const loaded = await loadTeam(k)
        const incoming = {
          companyCode,
          syncSecret,
          shopName: body.shopName || 'AZ POS',
          drivers: asArray(body.drivers),
          cashiers: asArray(body.cashiers),
          missions: asArray(body.missions),
          products: asArray(body.products),
          clients: asArray(body.clients),
          orders: asArray(body.orders),
          cashEntries: asArray(body.cashEntries),
          updatedAt: new Date().toISOString(),
        }
        const payload = mergeTeamPayload(loaded.data, incoming)
        const saved = await saveTeam(k, payload)
        if (!saved.ok && saved.storage === 'memory') {
          res.status(503).json({
            ok: false,
            message:
              saved.warning ||
              'Stockage durable indisponible — configure BLOB_READ_WRITE_TOKEN',
            storage: saved.storage,
          })
          return
        }
        res.status(200).json({
          ok: true,
          updatedAt: payload.updatedAt,
          storage: saved.storage,
          data: payload,
          ...(saved.warning ? { warning: saved.warning } : {}),
        })
        return
      }

      if (action === 'join') {
        const companyCode = String(body.companyCode || '')
          .trim()
          .toUpperCase()
        const syncSecret = String(body.syncSecret || '').trim()
        const pin = String(body.pin || '')
          .replace(/\D/g, '')
          .slice(0, 4)
        const roleHint = String(body.role || '').trim()
        const { data, storage, warning } = await loadTeam(
          keyOf(companyCode, syncSecret),
        )
        if (!data) {
          res.status(404).json({
            message: warning || 'Code société / secret invalide',
            storage,
          })
          return
        }

        const wantCashier = roleHint === 'cashier'
        const wantDriver = roleHint === 'driver'

        const cashier = (data.cashiers || []).find(
          (c) => c.active !== false && String(c.pin) === pin,
        )
        const driver = (data.drivers || []).find(
          (d) => d.active !== false && String(d.pin) === pin,
        )

        if (wantCashier || (!wantDriver && cashier && !driver)) {
          if (!cashier) {
            res.status(403).json({ message: 'PIN caissier incorrect' })
            return
          }
          res.status(200).json({
            ok: true,
            role: 'cashier',
            cashier: {
              id: cashier.id,
              name: cashier.name,
              phone: cashier.phone,
              active: cashier.active !== false,
              createdAt: cashier.createdAt,
              pin: cashier.pin,
            },
            data: sanitizeForCashier(data),
            storage,
          })
          return
        }

        if (!driver) {
          res.status(403).json({
            message: wantDriver
              ? 'PIN livreur incorrect'
              : 'PIN incorrect (livreur ou caissier)',
          })
          return
        }
        res.status(200).json({
          ok: true,
          role: 'driver',
          driver: {
            id: driver.id,
            name: driver.name,
            phone: driver.phone,
            active: driver.active !== false,
            createdAt: driver.createdAt,
            pin: driver.pin,
          },
          data: sanitizeForDriver(data, driver.id),
          storage,
        })
        return
      }

      if (action === 'patchStop') {
        const companyCode = String(body.companyCode || '')
          .trim()
          .toUpperCase()
        const syncSecret = String(body.syncSecret || '').trim()
        const missionId = body.missionId
        const stopId = body.stopId
        const status = body.status
        const collectedDa =
          typeof body.collectedDa === 'number' ? body.collectedDa : undefined
        const note = typeof body.note === 'string' ? body.note : undefined
        const cashPostedAt =
          typeof body.cashPostedAt === 'string' ? body.cashPostedAt : undefined
        const cashPostedDa =
          typeof body.cashPostedDa === 'number' ? body.cashPostedDa : undefined
        const k = keyOf(companyCode, syncSecret)
        const loaded = await loadTeam(k)
        const data = loaded.data
        if (!data) {
          res.status(404).json({ message: 'Équipe introuvable' })
          return
        }
        data.missions = (data.missions || []).map((m) => {
          if (m.id !== missionId) return m
          const stops = (m.stops || []).map((s) => {
            if (s.id !== stopId) return s
            const nextStatus = status || s.status
            const nextCollected =
              collectedDa !== undefined
                ? Math.max(s.collectedDa || 0, collectedDa)
                : s.collectedDa
            return {
              ...s,
              status: nextStatus,
              collectedDa: nextCollected,
              ...(note !== undefined ? { note } : {}),
              ...(cashPostedAt
                ? {
                    cashPostedAt: s.cashPostedAt || cashPostedAt,
                    cashPostedDa: Math.max(
                      s.cashPostedDa || 0,
                      cashPostedDa ?? nextCollected ?? 0,
                    ),
                  }
                : {}),
            }
          })
          return {
            ...m,
            stops,
            status: recomputeMissionStatus(m, stops),
            updatedAt: new Date().toISOString(),
          }
        })
        data.updatedAt = new Date().toISOString()
        const saved = await saveTeam(k, data)
        if (!saved.ok && saved.storage === 'memory') {
          res.status(503).json({
            ok: false,
            message: saved.warning || 'Stockage durable indisponible',
            storage: saved.storage,
          })
          return
        }
        const driverId = String(body.driverId || '')
        res.status(200).json({
          ok: true,
          data: driverId ? sanitizeForDriver(data, driverId) : data,
          storage: saved.storage,
        })
        return
      }

      res.status(400).json({ message: 'action inconnue' })
      return
    }

    res.status(405).json({ message: 'Method not allowed' })
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'error' })
  }
}
