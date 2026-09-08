/**
 * Sync équipe multi-poste (patron ↔ livreurs).
 * Stockage mémoire processus + miroir /tmp (warm instances Vercel).
 * Secours WhatsApp toujours disponible côté app.
 */

const fs = require('fs')
const path = require('path')

const TMP_DIR = '/tmp/gdz-team'
const TMP_FILE = path.join(TMP_DIR, 'store.json')

/** @type {Map<string, any>} */
const g = globalThis

function store() {
  if (!g.__gdzTeamStore) {
    g.__gdzTeamStore = new Map()
    tryLoadTmp(g.__gdzTeamStore)
  }
  return g.__gdzTeamStore
}

function tryLoadTmp(map) {
  try {
    if (!fs.existsSync(TMP_FILE)) return
    const raw = JSON.parse(fs.readFileSync(TMP_FILE, 'utf8'))
    if (raw && typeof raw === 'object') {
      for (const [k, v] of Object.entries(raw)) map.set(k, v)
    }
  } catch {
    /* ignore */
  }
}

function persistTmp(map) {
  try {
    if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true })
    const obj = Object.fromEntries(map.entries())
    fs.writeFileSync(TMP_FILE, JSON.stringify(obj))
  } catch {
    /* ignore — serverless may block fs */
  }
}

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
      const k = keyOf(companyCode, syncSecret)
      if (!companyCode || !syncSecret) {
        res.status(400).json({ message: 'companyCode et syncSecret requis' })
        return
      }
      const data = store().get(k)
      if (!data) {
        res.status(404).json({ message: 'Aucune donnée équipe pour ce code' })
        return
      }
      res.status(200).json(filterMissions(data, driverId))
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
        const payload = {
          companyCode,
          syncSecret,
          shopName: body.shopName || 'Grossiste DZ',
          drivers: Array.isArray(body.drivers) ? body.drivers : [],
          missions: Array.isArray(body.missions) ? body.missions : [],
          updatedAt: new Date().toISOString(),
        }
        const map = store()
        map.set(keyOf(companyCode, syncSecret), payload)
        persistTmp(map)
        res.status(200).json({ ok: true, updatedAt: payload.updatedAt })
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
        const data = store().get(keyOf(companyCode, syncSecret))
        if (!data) {
          res.status(404).json({ message: 'Code société / secret invalide' })
          return
        }
        const driver = (data.drivers || []).find(
          (d) => d.active !== false && String(d.pin) === pin,
        )
        if (!driver) {
          res.status(403).json({ message: 'PIN livreur incorrect' })
          return
        }
        res.status(200).json({
          ok: true,
          driver,
          data: filterMissions(data, driver.id),
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
        const k = keyOf(companyCode, syncSecret)
        const map = store()
        const data = map.get(k)
        if (!data) {
          res.status(404).json({ message: 'Équipe introuvable' })
          return
        }
        data.missions = (data.missions || []).map((m) => {
          if (m.id !== missionId) return m
          const stops = (m.stops || []).map((s) => {
            if (s.id !== stopId) return s
            return {
              ...s,
              ...(status ? { status } : {}),
              ...(collectedDa !== undefined ? { collectedDa } : {}),
              ...(note !== undefined ? { note } : {}),
            }
          })
          const allDone = stops.every(
            (s) => s.status === 'done' || s.status === 'skipped',
          )
          const anyProgress = stops.some((s) => s.status !== 'todo')
          let mStatus = m.status
          if (allDone && stops.length) mStatus = 'done'
          else if (anyProgress) mStatus = 'in_progress'
          return {
            ...m,
            stops,
            status: mStatus,
            updatedAt: new Date().toISOString(),
          }
        })
        data.updatedAt = new Date().toISOString()
        map.set(k, data)
        persistTmp(map)
        res.status(200).json({ ok: true, data })
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
