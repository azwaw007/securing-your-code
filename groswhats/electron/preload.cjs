const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('azTv', {
  wake: (mac) => ipcRenderer.invoke('tv-wol', mac),
  fetchUrl: (url) => ipcRenderer.invoke('tv-fetch', url),
})
