import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
    // Messages from left renderer to main process
    selectPlan: (planId) => ipcRenderer.invoke('selectPlan', planId),
    exportPDF: () => ipcRenderer.invoke('exportPDF'),
    refresh: () => ipcRenderer.invoke('refresh'),

    getFromStore: (key) => ipcRenderer.invoke('getFromStore', key),
    setInStore: (key, value) => ipcRenderer.invoke('setInStore', key, value),

    // Messages from main process to left renderer
    onSetConnected: (callback) => ipcRenderer.on('setConnected', (_event, value) => callback(value)),
    onSetPlans: (callback) => ipcRenderer.on('setPlans', (_event, value) => callback(value))
})