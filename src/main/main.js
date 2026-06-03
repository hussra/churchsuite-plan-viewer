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

import { app, BaseWindow, Menu, shell } from 'electron'

import { addIpcHandlers } from './ipcHandlers'
import { Controller } from './controller'
import { MainWindow } from './window-main'
import { showAboutWindow } from './window-about'

import started from 'electron-squirrel-startup'

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
    app.quit()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {

    const isMac = process.platform === 'darwin'

    if (isMac) {
       
        const template = [
            // { role: 'appMenu' }
            {
                label: app.name,
                submenu: [
                    { label: `About ${app.name}`, click: () => { showAboutWindow() } },
                    { type: 'separator' },
                    { role: 'hide' },
                    { role: 'hideOthers' },
                    { role: 'unhide' },
                    { type: 'separator' },
                    { role: 'quit' }
                ]
            },
            // { role: 'fileMenu' }
            {
                label: 'File',
                submenu: [
                    { role: 'close' }
                ]
            },
            // { role: 'editMenu' }
            {
                label: 'Edit',
                submenu: [
                    { role: 'copy' },
                    { role: 'selectAll' }
                ]
            },
            // { role: 'windowMenu' }
            {
                label: 'Window',
                submenu: [
                    { role: 'minimize' },
                    { type: 'separator' },
                    { role: 'front' }
                ]
            },
            {
                role: 'help',
                submenu: [
                    {
                        label: 'ChurchSuite Plan Viewer Help...',
                        click: async () => {
                            await shell.openExternal('https://hussra.github.io/churchsuite-plan-viewer/')
                        }
                    }
                ]
            }
        ]

        const menu = Menu.buildFromTemplate(template)
        Menu.setApplicationMenu(menu)

        // Set dock icon
        app.dock.setIcon('assets/icon.png')
    }


    // The Controller contains all the business logic for the application
    let controller = new Controller()
    globalThis.mainWindow = new MainWindow(controller)
    
    addIpcHandlers(controller)

    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    app.on('activate', () => {
        if (BaseWindow.getAllWindows().length === 0) {
            globalThis.mainWindow = new MainWindow(controller)
        }
    })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})