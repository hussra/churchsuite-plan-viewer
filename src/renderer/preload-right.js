import { contextBridge, ipcRenderer } from 'electron/renderer'

contextBridge.exposeInMainWorld('electronAPI', {
    onSetPlan: (callback) => ipcRenderer.on('setPlan', (_event, value) => callback(value))
})