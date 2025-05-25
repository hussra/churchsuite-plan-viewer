import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
    getPlans: () => ipcRenderer.invoke('getPlans'),
    changePlan: (planId) => ipcRenderer.invoke('changePlan', planId),
    exportPDF: () => ipcRenderer.invoke('exportPDF'),
    getFromStore: (key) => ipcRenderer.invoke('getFromStore', key),
    setInStore: (key, value) => ipcRenderer.invoke('setInStore', key, value)
})