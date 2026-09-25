const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('azTv', {
  wake: (mac) => ipcRenderer.invoke('tv-wol', mac),
  fetchUrl: (url) => ipcRenderer.invoke('tv-fetch', url),
  adbPower: (payload) => ipcRenderer.invoke('tv-adb', payload),
})

contextBridge.exposeInMainWorld('azDesktop', {
  isElectron: true,
  platform: process.platform,
  /** F1…F12 depuis le process principal (après interception menu / Help). */
  onFKey: (cb) => {
    if (typeof cb !== 'function') return () => {}
    const handler = (_event, key) => {
      try {
        cb(String(key || ''))
      } catch {
        /* ignore */
      }
    }
    ipcRenderer.on('az-desktop-fkey', handler)
    return () => {
      ipcRenderer.removeListener('az-desktop-fkey', handler)
    }
  },
})
