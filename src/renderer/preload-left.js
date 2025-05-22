import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
    getPlans: () => ipcRenderer.invoke('getPlans'),
    changePlan: (planId) => ipcRenderer.invoke('changePlan', planId)
})