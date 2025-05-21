import { ipcMain } from 'electron'
import { getPlans } from './api'

export async function addIpcHandlers() {
    ipcMain.handle('getPlans', async () => {

        const planData = await getPlans()
        console.log(planData)

        return planData.data.map((plan) => {
            return {
                id: plan.id,
                date: plan.date
            }
        })
    })

    ipcMain.handle('changePlan', (event, planId) => {
        console.log('Selected plan ' + planId)
    })
}