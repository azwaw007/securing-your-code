/** Merge missions / stops : ne jamais écraser le progrès livreur. */

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
  // Keep cloud-only stops that already progressed
  for (const s of cloud.stops || []) {
    if (![...(incoming.stops || [])].some((x) => x.id === s.id) && hasProgress({ stops: [s], status: s.status })) {
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
    // Structure (title/date/driver) from newer; progress from merge
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

function mergeDrivers(cloudList, incomingList) {
  const map = new Map()
  for (const d of cloudList || []) map.set(d.id, d)
  for (const d of incomingList || []) map.set(d.id, d)
  return [...map.values()]
}

function mergeTeamPayload(existing, incoming) {
  if (!existing) {
    return {
      ...incoming,
      updatedAt: incoming.updatedAt || new Date().toISOString(),
    }
  }
  return {
    companyCode: incoming.companyCode || existing.companyCode,
    syncSecret: incoming.syncSecret || existing.syncSecret,
    shopName: incoming.shopName || existing.shopName,
    drivers: mergeDrivers(existing.drivers, incoming.drivers),
    missions: mergeMissions(existing.missions, incoming.missions),
    updatedAt: new Date().toISOString(),
  }
}

export {
  mergeStop,
  mergeMission,
  mergeMissions,
  mergeDrivers,
  mergeTeamPayload,
  hasProgress,
  recomputeMissionStatus,
}
