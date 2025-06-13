import { ipcMain } from 'electron'
import { controller } from './main'

export async function addIpcHandlers() {

    // Called when left pane asks for list of plans to be refreshed
    ipcMain.handle('refresh', async () => {
        controller.reload()
    })

    ipcMain.handle('isConfigured', async () => {
        return controller.isConfigured()
    })

    // Called when plan selected in left pane
    ipcMain.handle('selectPlan', (event, planId) => {
        controller.selectedPlanId = planId
    })

    // Called when "Export PDF" clicked in left pane
    ipcMain.handle('exportPDF', () => {
        controller.exportPDF()
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
}