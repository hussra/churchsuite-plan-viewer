// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron/renderer'

// window.addEventListener('DOMContentLoaded', () => {
//     ipcRenderer.on('setPlan', (_event, value) => {
//         alert(value)
//     })
// })

contextBridge.exposeInMainWorld('electronAPI', {
    onSetPlan: (callback) => ipcRenderer.on('setPlan', (_event, value) => callback(value))
})