const { app, BrowserWindow, shell, ipcMain } = require('electron')
const path = require('path')
const dgram = require('dgram')
const http = require('http')
const https = require('https')
const { execFile } = require('child_process')
const fs = require('fs')

const isDev = !app.isPackaged

function createWindow() {
  const win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: 'AZ POS',
    backgroundColor: '#f3efe6',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    autoHideMenuBar: true,
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDev && process.env.ELECTRON_START_URL) {
    win.loadURL(process.env.ELECTRON_START_URL)
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }
}

/** MAC → buffer 6 octets */
function parseMac(mac) {
  const hex = String(mac || '')
    .trim()
    .toLowerCase()
    .replace(/[^0-9a-f]/g, '')
  if (hex.length !== 12) return null
  const buf = Buffer.alloc(6)
  for (let i = 0; i < 6; i++) buf[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return buf
}

/** Magic packet Wake-on-LAN (UDP 9) */
function sendWol(mac) {
  return new Promise((resolve) => {
    const macBuf = parseMac(mac)
    if (!macBuf) {
      resolve({ ok: false, detail: 'MAC invalide (ex. AA:BB:CC:DD:EE:FF)' })
      return
    }
    const packet = Buffer.alloc(102)
    packet.fill(0xff, 0, 6)
    for (let i = 1; i <= 16; i++) macBuf.copy(packet, i * 6)
    const sock = dgram.createSocket('udp4')
    sock.once('error', (err) => {
      try {
        sock.close()
      } catch {
        /* ignore */
      }
      resolve({ ok: false, detail: err.message })
    })
    sock.bind(() => {
      try {
        sock.setBroadcast(true)
      } catch {
        /* ignore */
      }
      sock.send(packet, 0, packet.length, 9, '255.255.255.255', (err) => {
        try {
          sock.close()
        } catch {
          /* ignore */
        }
        if (err) resolve({ ok: false, detail: err.message })
        else resolve({ ok: true })
      })
    })
  })
}

/** GET HTTP(S) local vers TV / prise (évite CORS du navigateur) */
function fetchLocal(url) {
  return new Promise((resolve) => {
    let parsed
    try {
      parsed = new URL(String(url || '').trim())
    } catch {
      resolve({ ok: false, detail: 'URL invalide' })
      return
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      resolve({ ok: false, detail: 'http/https seulement' })
      return
    }
    const lib = parsed.protocol === 'https:' ? https : http
    const req = lib.get(
      parsed,
      { timeout: 4000, headers: { 'User-Agent': 'AZ-POS' } },
      (res) => {
        res.resume()
        resolve({ ok: true, detail: `HTTP ${res.statusCode || 0}` })
      },
    )
    req.on('timeout', () => {
      req.destroy()
      resolve({ ok: false, detail: 'timeout' })
    })
    req.on('error', (err) => resolve({ ok: false, detail: err.message }))
  })
}

function resolveAdbPath() {
  const env = process.env.AZ_POS_ADB || process.env.ADB
  if (env && fs.existsSync(env)) return env
  const candidates = [
    path.join(process.resourcesPath || '', 'adb', process.platform === 'win32' ? 'adb.exe' : 'adb'),
    path.join(__dirname, 'adb', process.platform === 'win32' ? 'adb.exe' : 'adb'),
    process.platform === 'win32' ? 'adb.exe' : 'adb',
  ]
  for (const c of candidates) {
    if (c === 'adb' || c === 'adb.exe') return c
    if (fs.existsSync(c)) return c
  }
  return process.platform === 'win32' ? 'adb.exe' : 'adb'
}

function runAdb(args, timeoutMs = 8000) {
  return new Promise((resolve) => {
    const bin = resolveAdbPath()
    const child = execFile(
      bin,
      args,
      { timeout: timeoutMs, windowsHide: true, encoding: 'utf8' },
      (err, stdout, stderr) => {
        const out = `${stdout || ''}\n${stderr || ''}`.trim()
        if (err) {
          const msg = err.code === 'ENOENT'
            ? 'ADB introuvable — installe Platform-Tools et ajoute adb au PATH'
            : out || err.message
          resolve({ ok: false, detail: msg })
          return
        }
        resolve({ ok: true, detail: out })
      },
    )
    child.on('error', (err) => {
      resolve({
        ok: false,
        detail:
          err.code === 'ENOENT'
            ? 'ADB introuvable — installe Platform-Tools (Google) et adb dans le PATH'
            : err.message,
      })
    })
  })
}

/**
 * Google TV / Android TV via ADB réseau.
 * Prérequis TV : options développeur → débogage réseau / USB débogage.
 */
async function adbPower(payload) {
  const host = String(payload?.host || '')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
    .replace(/:.*$/, '')
  const port = Math.max(1, Math.min(65535, Number(payload?.port) || 5555))
  const action = payload?.action === 'on' ? 'on' : 'off'
  if (!host) return { ok: false, detail: 'IP Google TV manquante' }

  const target = `${host}:${port}`
  const connect = await runAdb(['connect', target])
  if (!connect.ok) return connect
  if (/unable to connect|failed|refused|unauthorized/i.test(connect.detail || '')) {
    return {
      ok: false,
      detail:
        connect.detail ||
        'Connexion ADB refusée — active le débogage réseau et accepte « Autoriser » sur la TV',
    }
  }

  // WAKEUP=224, SLEEP=223, POWER=26
  const key = action === 'on' ? 'KEYCODE_WAKEUP' : 'KEYCODE_SLEEP'
  const shell = await runAdb([
    '-s',
    target,
    'shell',
    'input',
    'keyevent',
    key,
  ])
  if (!shell.ok) {
    // repli POWER (bascule)
    const alt = await runAdb(['-s', target, 'shell', 'input', 'keyevent', 'KEYCODE_POWER'])
    if (!alt.ok) return alt
  }
  return { ok: true, detail: `adb ${action} ${target}` }
}

ipcMain.handle('tv-wol', async (_evt, mac) => sendWol(mac))
ipcMain.handle('tv-fetch', async (_evt, url) => fetchLocal(url))
ipcMain.handle('tv-adb', async (_evt, payload) => adbPower(payload))

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
