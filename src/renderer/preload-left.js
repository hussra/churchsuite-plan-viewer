// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
    getPlans: () => ipcRenderer.invoke('getPlans'),
    changePlan: (planId) => ipcRenderer.invoke('changePlan', planId)
})