import type { Order, ShopSettings } from '../types'
import { unitLabel } from '../i18n'
import { formatDa, formatQty } from './format'
import { paymentSummaryLines } from './paymentText'

export function buildTicketText(order: Order, settings: ShopSettings): string {
  const lang = settings.language
  const date = new Date(order.createdAt).toLocaleString(lang === 'ar' ? 'ar-DZ' : 'fr-DZ')
  const lines = order.lines
    .map((l) => {
      const base = `${formatQty(l.qty)} ${unitLabel(lang, l.unit)} ${l.name}\n  ${formatDa(l.lineTotalDa)}`
      return l.imei ? `${base}\n  IMEI ${l.imei}` : base
    })
    .join('\n')
  const pay = paymentSummaryLines(order, lang)

  if (lang === 'ar') {
    return [
      settings.shopName,
      settings.city,
      settings.phone,
      '------------------------',
      `تذكرة: ${order.id.slice(-6).toUpperCase()}`,
      `التاريخ: ${date}`,
      `الزبون: ${order.clientName}`,
      '------------------------',
      lines,
      '------------------------',
      order.discountDa && order.discountDa > 0
        ? `خصم: -${formatDa(order.discountDa)}${
            order.discountPercent ? ` (${order.discountPercent}%)` : ''
          }`
        : '',
      `المجموع: ${formatDa(order.totalDa)}`,
      ...pay,
      '------------------------',
      'شكرا لثقتكم',
      '',
    ]
      .filter((x) => x !== '')
      .join('\n')
  }

  return [
    settings.shopName.toUpperCase(),
    settings.city,
    settings.phone,
    '------------------------',
    `Ticket: ${order.id.slice(-6).toUpperCase()}`,
    `Date: ${date}`,
    `Client: ${order.clientName}`,
    '------------------------',
    lines,
    '------------------------',
    order.discountDa && order.discountDa > 0
      ? `Remise: -${formatDa(order.discountDa)}${
          order.discountPercent ? ` (${order.discountPercent}%)` : ''
        }`
      : '',
    `TOTAL: ${formatDa(order.totalDa)}`,
    ...pay,
    '------------------------',
    'Merci pour votre confiance',
    '',
  ]
    .filter((x) => x !== '')
    .join('\n')
}

function encodeEscPos(text: string): Uint8Array {
  const encoder = new TextEncoder()
  const init = new Uint8Array([0x1b, 0x40])
  const body = encoder.encode(text + '\n\n\n')
  const cut = new Uint8Array([0x1d, 0x56, 0x00])
  const out = new Uint8Array(init.length + body.length + cut.length)
  out.set(init, 0)
  out.set(body, init.length)
  out.set(cut, init.length + body.length)
  return out
}

/**
 * Imprime le ticket.
 * - Bluetooth thermique si disponible (Android Chrome)
 * - Sinon dialogue d'impression système (sans nouvel onglet)
 */
export async function printTicketBluetooth(
  order: Order,
  settings: ShopSettings,
  customText?: string,
): Promise<'bluetooth' | 'system'> {
  const text = customText?.trim() || buildTicketText(order, settings)

  const nav = navigator as Navigator & {
    bluetooth?: {
      requestDevice: (options: {
        acceptAllDevices?: boolean
        optionalServices?: string[]
      }) => Promise<BluetoothDevice>
    }
  }

  // Uniquement si l'utilisateur a déjà une imprimante Bluetooth et Chrome Android
  if (nav.bluetooth && settingsPreferBluetooth()) {
    try {
      const device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'],
      })
      const gatt = device.gatt
      if (!gatt) throw new Error('GATT unavailable')
      const server = await gatt.connect()
      const service = await server.getPrimaryService(
        '000018f0-0000-1000-8000-00805f9b34fb',
      )
      const characteristic = await service.getCharacteristic(
        '00002af1-0000-1000-8000-00805f9b34fb',
      )
      await characteristic.writeValue(new Uint8Array(encodeEscPos(text)))
      return 'bluetooth'
    } catch {
      // Annulation ou échec Bluetooth → impression système (pas de nouvel onglet)
    }
  }

  printInPage(text)
  return 'system'
}

/** Par défaut on n'ouvre PAS le sélecteur Bluetooth (ça confuse). */
const BT_PRINTER_KEY = 'az-pos-use-bt-printer'
const BT_PRINTER_LEGACY = 'groswhats-use-bt-printer'

function settingsPreferBluetooth(): boolean {
  return (
    localStorage.getItem(BT_PRINTER_KEY) === '1' ||
    localStorage.getItem(BT_PRINTER_LEGACY) === '1'
  )
}

/** Active l'essai Bluetooth (réglage optionnel). */
export function setPreferBluetoothPrinter(enabled: boolean): void {
  localStorage.setItem(BT_PRINTER_KEY, enabled ? '1' : '0')
}

export function getPreferBluetoothPrinter(): boolean {
  return settingsPreferBluetooth()
}

/** Impression dans la même page via iframe cachée — pas de nouvel onglet. */
function printInPage(text: string): void {
  const existing = document.getElementById('az-pos-print-frame')
  if (existing) existing.remove()

  const iframe = document.createElement('iframe')
  iframe.id = 'az-pos-print-frame'
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.cssText =
    'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;'
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument
  if (!doc) {
    window.print()
    return
  }

  doc.open()
  doc.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Ticket</title>
  <style>
    @page { margin: 8mm; size: auto; }
    body {
      margin: 0;
      font-family: ui-monospace, Consolas, monospace;
      font-size: 12px;
      white-space: pre-wrap;
      color: #000;
    }
  </style>
</head>
<body>${escapeHtml(text)}</body>
</html>`)
  doc.close()

  const trigger = () => {
    try {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
    } finally {
      window.setTimeout(() => iframe.remove(), 1000)
    }
  }

  // Laisser le temps au document iframe de se charger
  if (iframe.contentDocument?.readyState === 'complete') {
    trigger()
  } else {
    iframe.onload = trigger
    window.setTimeout(trigger, 250)
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

interface BluetoothRemoteGATTCharacteristic {
  writeValue: (value: Uint8Array) => Promise<void>
}
interface BluetoothRemoteGATTService {
  getCharacteristic: (uuid: string) => Promise<BluetoothRemoteGATTCharacteristic>
}
interface BluetoothRemoteGATTServer {
  connect: () => Promise<BluetoothRemoteGATTServer>
  getPrimaryService: (uuid: string) => Promise<BluetoothRemoteGATTService>
}
interface BluetoothDevice {
  gatt?: BluetoothRemoteGATTServer
}
