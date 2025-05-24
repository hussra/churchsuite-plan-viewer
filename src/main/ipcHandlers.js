import { ipcMain } from 'electron'
import { getPlans } from './api'
import { controller, loadPlan, exportPDF } from './main'

export async function addIpcHandlers() {

    // Called when left pane asks for current list of plans
    ipcMain.handle('getPlans', async () => {

        await controller.loadPlans()
        return controller.plans
    })

    // Called when plan selected in left pane
    ipcMain.handle('changePlan', (event, planId) => {
        loadPlan(planId)
        controller.planId = planId
    })

    // Called when "Export PDF" clicked in left pane
    ipcMain.handle('exportPDF', () => {
        exportPDF()
    })
}