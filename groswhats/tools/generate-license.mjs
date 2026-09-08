#!/usr/bin/env node
/**
 * Générateur de licences Grossiste DZ (vendeur)
 *
 * Usage:
 *   node tools/generate-license.mjs "Nom du commerce" [jours=365]
 *   node tools/generate-license.mjs "Épicerie Amel" 365
 *
 * IMPORTANT: le SECRET doit être identique à LICENSE_SECRET dans src/license/license.ts
 */

import { createHash } from 'node:crypto'

const SECRET = process.env.GDZ_LICENSE_SECRET || 'GROSSISTE-DZ-SECRET-CHANGE-MOI-2026'

function toBase64Url(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function sign(payloadJson) {
  return createHash('sha256')
    .update(`${payloadJson}::${SECRET}`)
    .digest('hex')
    .slice(0, 20)
}

function createKey(customer, days) {
  const exp = new Date()
  exp.setDate(exp.getDate() + days)
  const payload = {
    c: customer.trim() || 'Client',
    e: exp.toISOString().slice(0, 10),
    p: 'annual',
  }
  const json = JSON.stringify(payload)
  const body = toBase64Url(json)
  const sig = sign(json)
  return { key: `GDZ1.${body}.${sig}`, payload }
}

const customer = process.argv[2] || 'Client Grossiste'
const days = Number(process.argv[3] || 365)

const { key, payload } = createKey(customer, days)

console.log('')
console.log('=== Grossiste DZ — Licence annuelle ===')
console.log(`Client     : ${payload.c}`)
console.log(`Expire le  : ${payload.e}`)
console.log(`Durée      : ${days} jours`)
console.log('')
console.log('CLÉ (à envoyer au client) :')
console.log(key)
console.log('')
