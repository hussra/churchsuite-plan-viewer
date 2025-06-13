import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
    // Messages from left renderer to main process
    getPlans: () => ipcRenderer.invoke('getPlans'),
    changePlan: (planId) => ipcRenderer.invoke('changePlan', planId),
    exportPDF: () => ipcRenderer.invoke('exportPDF'),
    getFromStore: (key) => ipcRenderer.invoke('getFromStore', key),
    setInStore: (key, value) => ipcRenderer.invoke('setInStore', key, value),
    isConfigured: () => ipcRenderer.invoke('isConfigured'),
    refresh: () => ipcRenderer.invoke('refresh'),

    // Messages from main process to left renderer
    onSetConnected: (callback) => ipcRenderer.on('setConnected', (_event, value) => callback(value))
})