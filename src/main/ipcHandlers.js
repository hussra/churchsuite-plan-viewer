import { ipcMain } from 'electron'
import { controller } from './main'

export async function addIpcHandlers() {

    // Called when left pane asks for current list of plans
    ipcMain.handle('getPlans', async () => {
        await controller.loadPlans()
        return controller.plans
    })

    // Called when plan selected in left pane
    ipcMain.handle('changePlan', (event, planId) => {
        controller.selectedPlan = planId
    })

    // Called when "Export PDF" clicked in left pane
    ipcMain.handle('exportPDF', () => {
        controller.exportPDF()
    })
}