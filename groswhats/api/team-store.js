/**
 * Stockage équipe durable via Vercel Blob (BLOB_READ_WRITE_TOKEN).
 * Cache mémoire process pour les lectures chaudes.
 */
import { put, get } from '@vercel/blob'
import crypto from 'node:crypto'

/** @type {Map<string, any>} */
const mem = (globalThis.__gdzTeamMem = globalThis.__gdzTeamMem || new Map())

function hasBlob() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN)
}

function pathnameFor(key) {
  const hash = crypto.createHash('sha256').update(key).digest('hex').slice(0, 40)
  return `gdz-team/${hash}.json`
}

async function streamToString(stream) {
  const res = new Response(stream)
  return res.text()
}

async function loadTeam(key) {
  if (mem.has(key)) return { data: mem.get(key), storage: hasBlob() ? 'blob+cache' : 'memory' }

  if (!hasBlob()) {
    return { data: null, storage: 'memory', warning: 'BLOB_READ_WRITE_TOKEN manquant' }
  }

  try {
    const result = await get(pathnameFor(key), {
      access: 'private',
      useCache: false,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })
    if (!result || result.statusCode === 404 || result.statusCode === 304) {
      return { data: null, storage: 'blob' }
    }
    if (result.statusCode !== 200 || !result.stream) {
      return { data: null, storage: 'blob', warning: `blob get ${result.statusCode}` }
    }
    const text = await streamToString(result.stream)
    const data = JSON.parse(text)
    mem.set(key, data)
    return { data, storage: 'blob' }
  } catch (e) {
    return {
      data: null,
      storage: 'blob',
      warning: e instanceof Error ? e.message : 'blob read fail',
    }
  }
}

async function saveTeam(key, data) {
  mem.set(key, data)

  if (!hasBlob()) {
    return {
      ok: false,
      storage: 'memory',
      warning:
        'BLOB_READ_WRITE_TOKEN manquant — crée un Blob Store Vercel et lie-le au projet',
    }
  }

  try {
    await put(pathnameFor(key), JSON.stringify(data), {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      cacheControlMaxAge: 0,
    })
    return { ok: true, storage: 'blob' }
  } catch (e) {
    return {
      ok: false,
      storage: 'memory',
      warning: e instanceof Error ? e.message : 'blob write fail',
    }
  }
}

export { hasBlob, loadTeam, saveTeam }
