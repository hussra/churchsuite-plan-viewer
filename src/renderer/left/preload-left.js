// ChurchSuite Plan Viewer
// Copyright (C) 2025 Richard Huss
//
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU General Public License as published by the Free
// Software Foundation, either version 3 of the License, or (at your option)
// any later version.
//
// This program is distributed in the hope that it will be useful, but WITHOUT
// ANY WARRANTY; without even the implied warranty of  MERCHANTABILITY or
// FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
// more details.
//
// You should have received a copy of the GNU General Public License along with
// this program.  If not, see <http://www.gnu.org/licenses/>.

import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
    // Messages from left renderer to main process
    selectPlan: (planId) => ipcRenderer.invoke('selectPlan', planId),
    selectTemplate: (templateId) => ipcRenderer.invoke('selectTemplate', templateId),
    exportPDF: () => ipcRenderer.invoke('exportPDF'),
    refresh: () => ipcRenderer.invoke('refresh'),
    editTemplates: () => ipcRenderer.invoke('editTemplates'),
    getTemplates: () => ipcRenderer.invoke('getTemplates'),
    leftRendererStartupComplete: () => ipcRenderer.invoke('leftRendererStartupComplete'),

    getGlobalSetting: (key) => ipcRenderer.invoke('getGlobalSetting', key),
    setGlobalSetting: (key, value) => ipcRenderer.invoke('setGlobalSetting', key, value),

    // Messages from main process to left renderer
    onSetConnected: (callback) => ipcRenderer.on('setConnected', (_event, value) => callback(value)),
    onSetPlans: (callback) => ipcRenderer.on('setPlans', (_event, value) => callback(value)),
    onSetTemplates: (callback) => ipcRenderer.on('setTemplates', (_event, value) => callback(value)),
    onSetTemplate: (callback) => ipcRenderer.on('setTemplate', (_event, value) => callback(value))
})