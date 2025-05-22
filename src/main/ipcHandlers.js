import { ipcMain } from 'electron'
import { getPlans } from './api'
import { setPlan } from './main'

export async function addIpcHandlers() {
    ipcMain.handle('getPlans', async () => {

        const planData = await getPlans()

        return planData.data.map((plan) => {
            return {
                id: plan.id,
                date: plan.date
            }
        })
    })

    ipcMain.handle('changePlan', (event, planId) => {
        setPlan(planId)
    })
}