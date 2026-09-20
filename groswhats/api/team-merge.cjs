/** Merge missions / stops / boutique : ne jamais écraser le progrès livreur ni perdre ventes. */

const STATUS_RANK = { todo: 0, skipped: 1, done: 2 }

function hasProgress(mission) {
  if (!mission) return false
  if (mission.status === 'in_progress' || mission.status === 'done') return true
  return (mission.stops || []).some(
    (s) =>
      s.status === 'done' ||
      s.status === 'skipped' ||
      (s.collectedDa || 0) > 0 ||
      Boolean(s.cashPostedAt),
  )
}

function mergeStop(cloud, incoming) {
  if (!cloud) return incoming
  if (!incoming) return cloud
  const cRank = STATUS_RANK[cloud.status] ?? 0
  const iRank = STATUS_RANK[incoming.status] ?? 0
  const status = cRank >= iRank ? cloud.status : incoming.status
  const collectedDa = Math.max(cloud.collectedDa || 0, incoming.collectedDa || 0)
  const cashPostedDa = Math.max(cloud.cashPostedDa || 0, incoming.cashPostedDa || 0)
  const cashPostedAt = cloud.cashPostedAt || incoming.cashPostedAt
  return {
    ...incoming,
    status,
    collectedDa,
    ...(cashPostedAt
      ? { cashPostedAt, cashPostedDa: cashPostedDa || collectedDa }
      : cashPostedDa
        ? { cashPostedDa }
        : {}),
    note:
      (cloud.note && cloud.note.length >= (incoming.note || '').length
        ? cloud.note
        : incoming.note) ||
      cloud.note ||
      '',
  }
}

function recomputeMissionStatus(mission, stops) {
  const allDone =
    stops.length > 0 &&
    stops.every((s) => s.status === 'done' || s.status === 'skipped')
  const anyProgress = stops.some((s) => s.status !== 'todo')
  if (allDone) return 'done'
  if (anyProgress) return 'in_progress'
  if (mission.driverId) return mission.status === 'draft' ? 'assigned' : mission.status
  return mission.status || 'draft'
}

function mergeMission(cloud, incoming) {
  if (!cloud) return incoming
  if (!incoming) return cloud

  const byId = new Map()
  for (const s of cloud.stops || []) byId.set(s.id, s)
  for (const s of incoming.stops || []) {
    byId.set(s.id, mergeStop(byId.get(s.id), s))
  }
  for (const s of cloud.stops || []) {
    if (
      ![...(incoming.stops || [])].some((x) => x.id === s.id) &&
      hasProgress({ stops: [s], status: s.status })
    ) {
      byId.set(s.id, s)
    }
  }

  const stops = [...byId.values()].sort(
    (a, b) => (a.sortOrder || 0) - (b.sortOrder || 0),
  )
  const newer =
    (incoming.updatedAt || '') >= (cloud.updatedAt || '') ? incoming : cloud
  const status = recomputeMissionStatus(newer, stops)
  const updatedAt =
    (incoming.updatedAt || '') >= (cloud.updatedAt || '')
      ? incoming.updatedAt || cloud.updatedAt
      : cloud.updatedAt || incoming.updatedAt

  return {
    ...newer,
    stops,
    status,
    updatedAt,
    createdAt: cloud.createdAt || incoming.createdAt,
  }
}

function mergeMissions(cloudList, incomingList) {
  const cloud = Array.isArray(cloudList) ? cloudList : []
  const incoming = Array.isArray(incomingList) ? incomingList : []
  const cloudMap = new Map(cloud.map((m) => [m.id, m]))
  const incomingIds = new Set(incoming.map((m) => m.id))
  const out = []

  for (const inc of incoming) {
    out.push(mergeMission(cloudMap.get(inc.id), inc))
  }
  for (const old of cloud) {
    if (!incomingIds.has(old.id) && hasProgress(old)) {
      out.push(old)
    }
  }

  return out.sort((a, b) =>
    (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || ''),
  )
}

function mergeByIdKeepCloud(cloudList, incomingList) {
  const map = new Map()
  for (const d of cloudList || []) {
    if (d && d.id) map.set(d.id, d)
  }
  for (const d of incomingList || []) {
    if (d && d.id) map.set(d.id, d)
  }
  return [...map.values()]
}

function stampOf(row) {
  return row?.updatedAt || row?.createdAt || ''
}

/** Produits lean : LWW par updatedAt ; si égal → min stock / dépôt (anti-survente). */
function mergeProduct(cloud, incoming) {
  if (!cloud) return incoming
  if (!incoming) return cloud
  const cStamp = stampOf(cloud)
  const iStamp = stampOf(incoming)
  if (iStamp > cStamp) return incoming
  if (cStamp > iStamp) return cloud
  const locs = new Set([
    ...Object.keys(cloud.stockByLocation || {}),
    ...Object.keys(incoming.stockByLocation || {}),
  ])
  const locMap = {}
  for (const loc of locs) {
    const a = cloud.stockByLocation?.[loc]
    const b = incoming.stockByLocation?.[loc]
    if (typeof a === 'number' && typeof b === 'number') locMap[loc] = Math.min(a, b)
    else if (typeof a === 'number') locMap[loc] = a
    else if (typeof b === 'number') locMap[loc] = b
  }
  const sum = Object.values(locMap).reduce(
    (s, n) => s + (typeof n === 'number' && Number.isFinite(n) ? n : 0),
    0,
  )
  return {
    ...cloud,
    ...incoming,
    stockByLocation: locMap,
    stock: +sum.toFixed(3),
    updatedAt: cloud.updatedAt || incoming.updatedAt || cloud.createdAt,
  }
}

function mergeProducts(cloudList, incomingList) {
  if (!Array.isArray(incomingList)) return Array.isArray(cloudList) ? cloudList : []
  const cloud = Array.isArray(cloudList) ? cloudList : []
  const map = new Map(cloud.filter((p) => p && p.id).map((p) => [p.id, p]))
  for (const p of incomingList) {
    if (!p || !p.id) continue
    map.set(p.id, mergeProduct(map.get(p.id), p))
  }
  return [...map.values()]
}

function mergeClients(cloudList, incomingList) {
  if (!Array.isArray(incomingList)) return Array.isArray(cloudList) ? cloudList : []
  const map = new Map()
  for (const c of cloudList || []) {
    if (c && c.id) map.set(c.id, c)
  }
  for (const c of incomingList || []) {
    if (!c || !c.id) continue
    const prev = map.get(c.id)
    if (!prev) {
      map.set(c.id, c)
      continue
    }
    const newer = stampOf(c) >= stampOf(prev) ? c : prev
    const older = newer === c ? prev : c
    map.set(c.id, {
      ...older,
      ...newer,
      balanceAdjustDa:
        typeof newer.balanceAdjustDa === 'number'
          ? newer.balanceAdjustDa
          : older.balanceAdjustDa,
    })
  }
  return [...map.values()]
}

/** Ventes / encaissements : union par id (append-only). */
function mergeByIdUnion(cloudList, incomingList) {
  if (!Array.isArray(incomingList)) return Array.isArray(cloudList) ? cloudList : []
  const map = new Map()
  for (const row of cloudList || []) {
    if (row && row.id) map.set(row.id, row)
  }
  for (const row of incomingList || []) {
    if (!row || !row.id) continue
    const prev = map.get(row.id)
    if (!prev) {
      map.set(row.id, row)
      continue
    }
    // Ne jamais baisser paidDa / amountDa
    if (typeof prev.paidDa === 'number' || typeof row.paidDa === 'number') {
      map.set(row.id, {
        ...prev,
        ...row,
        paidDa: Math.max(prev.paidDa || 0, row.paidDa || 0),
        remainingDa: Math.min(
          prev.remainingDa ?? row.remainingDa ?? 0,
          row.remainingDa ?? prev.remainingDa ?? 0,
        ),
      })
    } else if (typeof prev.amountDa === 'number' || typeof row.amountDa === 'number') {
      map.set(row.id, {
        ...prev,
        ...row,
        amountDa: Math.max(prev.amountDa || 0, row.amountDa || 0),
      })
    } else {
      map.set(row.id, { ...prev, ...row })
    }
  }
  return [...map.values()].sort((a, b) =>
    (b.createdAt || '').localeCompare(a.createdAt || ''),
  )
}

function mergeDrivers(cloudList, incomingList) {
  return mergeByIdKeepCloud(cloudList, incomingList)
}

function mergeCashiers(cloudList, incomingList) {
  return mergeByIdKeepCloud(cloudList, incomingList)
}

function mergeTeamPayload(existing, incoming) {
  if (!existing) {
    return {
      ...incoming,
      drivers: Array.isArray(incoming.drivers) ? incoming.drivers : [],
      cashiers: Array.isArray(incoming.cashiers) ? incoming.cashiers : [],
      missions: Array.isArray(incoming.missions) ? incoming.missions : [],
      products: Array.isArray(incoming.products) ? incoming.products : [],
      clients: Array.isArray(incoming.clients) ? incoming.clients : [],
      orders: Array.isArray(incoming.orders) ? incoming.orders : [],
      cashEntries: Array.isArray(incoming.cashEntries) ? incoming.cashEntries : [],
      updatedAt: incoming.updatedAt || new Date().toISOString(),
    }
  }
  return {
    companyCode: incoming.companyCode || existing.companyCode,
    syncSecret: incoming.syncSecret || existing.syncSecret,
    shopName: incoming.shopName || existing.shopName,
    drivers: mergeDrivers(existing.drivers, incoming.drivers),
    cashiers: mergeCashiers(existing.cashiers, incoming.cashiers),
    missions: mergeMissions(existing.missions, incoming.missions),
    products: mergeProducts(existing.products, incoming.products),
    clients: mergeClients(existing.clients, incoming.clients),
    orders: mergeByIdUnion(existing.orders, incoming.orders),
    cashEntries: mergeByIdUnion(existing.cashEntries, incoming.cashEntries),
    updatedAt: new Date().toISOString(),
  }
}

module.exports = {
  mergeStop,
  mergeMission,
  mergeMissions,
  mergeDrivers,
  mergeCashiers,
  mergeProducts,
  mergeClients,
  mergeByIdUnion,
  mergeTeamPayload,
  hasProgress,
  recomputeMissionStatus,
}
