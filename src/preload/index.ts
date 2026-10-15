// Ponte sicuro tra l'interfaccia e il sistema: espone solo le funzioni necessarie.
import { contextBridge, ipcRenderer } from 'electron'

type Filter = { name: string; extensions: string[] }

contextBridge.exposeInMainWorld('api', {
  platform: process.platform,
  version: process.versions.electron,
  saveDialog: (opts: { defaultPath?: string; filters?: Filter[] }) => ipcRenderer.invoke('dialog:save', opts),
  openDialog: (opts: { filters?: Filter[]; multiple?: boolean }) => ipcRenderer.invoke('dialog:open', opts),
  openFolderImages: () => ipcRenderer.invoke('dialog:openFolderImages'),
  saveMany: (opts: unknown) => ipcRenderer.invoke('dialog:saveMany', opts),
  writeFile: (path: string, data: Uint8Array) => ipcRenderer.invoke('fs:write', path, data),
  readFile: (path: string) => ipcRenderer.invoke('fs:read', path),
  writeRecovery: (data: Uint8Array) => ipcRenderer.invoke('recovery:write', data),
  readRecovery: () => ipcRenderer.invoke('recovery:read'),
  clearRecovery: () => ipcRenderer.invoke('recovery:clear'),
  setTitle: (title: string) => ipcRenderer.send('window:title', title),
  onMenu: (cb: (action: string) => void) => {
    const h = (_: unknown, action: string) => cb(action)
    ipcRenderer.on('menu:action', h)
    return () => ipcRenderer.removeListener('menu:action', h)
  },
  onBeforeClose: (cb: () => void) => {
    const h = () => cb()
    ipcRenderer.on('app:before-close', h)
    return () => ipcRenderer.removeListener('app:before-close', h)
  },
  closeNow: () => ipcRenderer.send('app:close-now')
})
