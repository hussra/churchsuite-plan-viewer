import { ipcMain } from 'electron'
import { getPlans } from './api'
import { loadPlan, exportPDF } from './main'

export async function addIpcHandlers() {

    // Called when left pane asks for current list of plans
    ipcMain.handle('getPlans', async () => {

        const planData = await getPlans()

        return planData.data.map((plan) => {
            return {
                id: plan.id,
                date: plan.date
            }
        })
    })

    // Called when plan selected in left pane
    ipcMain.handle('changePlan', (event, planId) => {
        loadPlan(planId)
    })

    // Called when "Export PDF" clicked in left pane
    ipcMain.handle('exportPDF', () => {
        exportPDF()
    })
}