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
            globalThis.editorWindow = new EditorWindow()
            return
        } else {
            if (globalThis.editorWindow.isDestroyed()) {
                globalThis.editorWindow = new EditorWindow()
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

    ipcMain.handle('getFullTemplate', (event, id) => {
        return controller.templateEngine.getFullTemplateById(id)
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

    // Get a setting from the setting store
    ipcMain.handle('getFromStore', (event, key) => {
        return controller.getSetting(key)
    })

    // Set a setting in the setting store
    ipcMain.handle('setInStore', (event, key, value) => {
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