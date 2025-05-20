const { ipcMain } = require('electron')

module.exports = {
    addIpcHandlers: function() {
        console.log('Adding IPC handlers')
        ipcMain.handle('getPlans', () => {
            return [
                {
                    id: 12,
                    date: '2025-05-25'
                },
                {
                    id: 13,
                    date: '2025-06-01'
                }
            ]
        })
    }
}