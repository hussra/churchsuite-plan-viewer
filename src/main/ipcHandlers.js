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

import { app, ipcMain } from 'electron'

import { EditorWindow } from './window-editor'

export async function addIpcHandlers(controller, mainWindow) {

    // Called when left pane asks for list of plans to be refreshed
    ipcMain.handle('refresh', async () => {
        controller.reload()
    })

    ipcMain.handle('editTemplates', () => {
        if (!globalThis.editorWindow) {
            // First time an editor window has been created
            globalThis.editorWindow = new EditorWindow(controller)
            return
        } else {
            if (globalThis.editorWindow.isDestroyed()) {
                globalThis.editorWindow = new EditorWindow(controller)
            } else {
                globalThis.editorWindow.bringToFront()
            }
        }
    })

    ipcMain.handle('getAllTemplates', () => {
        return controller.templateEngine.allTemplates
    })

    ipcMain.handle('getTemplate', (event, id) => {
        return controller.templateEngine.getTemplateById(id)
    })

    ipcMain.handle('duplicateTemplate', (event, id) => {
        return controller.templateEngine.duplicateTemplate(id)
    })

    ipcMain.handle('saveTemplate', (event, template) => {
        controller.templateEngine.saveTemplate(template)
    })

    ipcMain.handle('deleteTemplate', (event, id) => {
        globalThis.editorWindow?.deleteTemplate(id)
    })

    ipcMain.handle('exportTemplate', (event, id) => {
       globalThis.editorWindow?.exportTemplate(id)
    })

    ipcMain.handle('importTemplate', (event) => {
       globalThis.editorWindow?.importTemplate()
    })

    ipcMain.handle('isConfigured', async () => {
        return controller.isConfigured()
    })

    // Called when plan selected in left pane
    ipcMain.handle('selectPlan', (event, planId) => {
        controller.selectedPlanId = planId
    })

    ipcMain.handle('selectTemplate', (event, templateId) => {
        controller.selectedTemplateId = templateId
    })

    // Called when "Export PDF" clicked in left pane
    ipcMain.handle('exportPDF', () => {
        mainWindow.exportPDF()
    })

    // Get a global setting from the setting store
    ipcMain.handle('getGlobalSetting', (event, key) => {
        return controller.getSetting(key)
    })

    // Set a global setting in the setting store
    ipcMain.handle('setGlobalSetting', (event, key, value) => {
        controller.saveSetting(key, value)
    })

    // Called when left renderer startup is complete
    ipcMain.handle('leftRendererStartupComplete', () => {
        controller.appStartupComplete()
    })

    ipcMain.handle('getVersion', () => {
        return app.getVersion()
    })

}