import { contextBridge, ipcRenderer } from 'electron/renderer'

contextBridge.exposeInMainWorld('electronAPI', {
    // Messages from main process to right renderer
    onSetPlan: (callback) => ipcRenderer.on('setPlan', (_event, value) => callback(value))
})