import { ipcMain } from 'electron'
import { controller } from './main'

export async function addIpcHandlers() {

    // Called when left pane asks for current list of plans
    ipcMain.handle('getPlans', async () => {
        await controller.loadPlans()
        return controller.allPlans
    })

    // Called when plan selected in left pane
    ipcMain.handle('changePlan', (event, planId) => {
        controller.selectedPlanId = planId
    })

    // Called when "Export PDF" clicked in left pane
    ipcMain.handle('exportPDF', () => {
        controller.exportPDF()
    })

    ipcMain.handle('getFromStore', (event, key) => {
        return controller.getSetting(key)
    })

    ipcMain.handle('setInStore', (event, key, value) => {
        controller.saveSetting(key, value)
    })
}