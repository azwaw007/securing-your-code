const { app, BrowserWindow, shell, ipcMain } = require('electron')
const path = require('path')
const dgram = require('dgram')
const http = require('http')
const https = require('https')

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

ipcMain.handle('tv-wol', async (_evt, mac) => sendWol(mac))
ipcMain.handle('tv-fetch', async (_evt, url) => fetchLocal(url))

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
