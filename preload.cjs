const { contextBridge, ipcRenderer } = require('electron')
contextBridge.exposeInMainWorld('nova', {
  openMedia: () => ipcRenderer.invoke('dialog:openMedia')
})
