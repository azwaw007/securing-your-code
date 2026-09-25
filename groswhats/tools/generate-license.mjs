#!/usr/bin/env node
/**
 * Générateur de licences AZ POS (vendeur)
 *
 * Usage:
 *   node tools/generate-license.mjs "Nom du commerce" [jours=365] [plan=standard]
 *   node tools/generate-license.mjs "Épicerie Amel" 365 pro3
 *
 * Plans: standard (1) | pro3 (3) | pro10 (10) | pro_max (illimité)
 * SECRET = LICENSE_SECRET dans src/license/license.ts
 */

import { createHash } from 'node:crypto'

const SECRET = process.env.GDZ_LICENSE_SECRET || 'GROSSISTE-DZ-SECRET-CHANGE-MOI-2026'

const PLANS = {
  standard: { id: 'standard', seats: 1, label: '1 poste' },
  pro3: { id: 'pro3', seats: 3, label: '3 postes' },
  pro10: { id: 'pro10', seats: 10, label: '10 postes' },
  pro_max: { id: 'pro_max', seats: 0, label: 'postes illimités' },
}

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

function createKey(customer, days, planId) {
  const plan = PLANS[planId] || PLANS.standard
  const exp = new Date()
  exp.setDate(exp.getDate() + days)
  const payload = {
    c: customer.trim() || 'Client',
    e: exp.toISOString().slice(0, 10),
    p: plan.id,
    s: plan.seats,
  }
  const json = JSON.stringify(payload)
  const body = toBase64Url(json)
  const sig = sign(json)
  return { key: `GDZ1.${body}.${sig}`, payload, plan }
}

const customer = process.argv[2] || 'Client AZ POS'
const days = Number(process.argv[3] || 365)
const planId = process.argv[4] || 'standard'

const { key, payload, plan } = createKey(customer, days, planId)

console.log('')
console.log('=== AZ POS — Licence ===')
console.log(`Client     : ${payload.c}`)
console.log(`Offre      : ${plan.id} (${plan.label})`)
console.log(`Expire le  : ${payload.e}`)
console.log(`Durée      : ${days} jours`)
console.log('')
console.log('CLÉ (à envoyer au client) :')
console.log(key)
console.log('')
