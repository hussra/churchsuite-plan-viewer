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

import path from 'path'
import * as fs from 'fs'
import { app, BrowserWindow, dialog, Menu, screen, shell } from 'electron'
import Ajv from 'ajv'

import { WINDOW_WIDTH, WINDOW_HEIGHT, TEMPLATE_SCHEMA_FILE } from './constants'

export class EditorWindow {

    constructor(controller) {
        this.#controller = controller

        const defaultWindowSize = this.#getDefaultWindowSize()

        this.#win = new BrowserWindow({
            width: defaultWindowSize.width,
            height: defaultWindowSize.height,
            title: app.getName() + ' - Layout Editor',
            modal: true,
            show: false,
            webPreferences: {
                preload: EDITOR_PRELOAD_WEBPACK_ENTRY,
            }
        })

        this.#win.menuBarVisible = false

        this.#win.loadURL(EDITOR_WEBPACK_ENTRY)

        // Context menu
        if (!app.isPackaged) {
            const aboutContextMenu = Menu.buildFromTemplate([
                {
                    label: 'Inspect',
                    click: async () => { this.#win.webContents.openDevTools({ mode: 'detach' }) }
                }
            ])
            this.#win.webContents.on('context-menu', (e, params) => {
                aboutContextMenu.popup()
            })
        }

        this.#controller.on('layoutsChanged', (newLayout) => {
            if (!this.isDestroyed()) {
                this.#win.webContents.send('setLayouts', this.#controller.allLayouts, newLayout)

                if (!newLayout) return
                
                dialog.showMessageBox(this.#win, {
                    type: 'question',
                    title: 'Layout Duplicated',
                    message: 'Do you want to edit the new layout?',
                    buttons: ['Yes', 'No'],
                }).then(
                    ({ response: ans }) => {
                        if (ans === 0) {
                            this.#controller.selectedLayoutId = newLayout
                        }
                    }
                )
            }
        })

        this.#controller.on('layoutChanged', () => {
            if (!this.isDestroyed()) {
                this.#win.webContents.send('setLayout', this.#controller.selectedLayoutId)
            }
        })

        this.#controller.on('selectedPlanChanged', () => {
            if (!this.isDestroyed()) {
                this.#win.webContents.send('setPlan', this.#controller.selectedPlan)
            }
        })

        this.#win.on('ready-to-show', () => {
            this.#win.show()
        })
    }

    #controller
    #win

    isDestroyed() {
        return this.#win.isDestroyed()
    }

    bringToFront() {
        this.#win.moveTop()
    }

    hide() {
        this.#win.hide()
        this.#win.destroy()
    }

    #getDefaultWindowSize() {
        const primaryDisplay = screen.getPrimaryDisplay()
        const { width: displayWidth, height: displayHeight } = primaryDisplay.workAreaSize

        return {
            width: Math.min(WINDOW_WIDTH, displayWidth),
            height: Math.min(WINDOW_HEIGHT, displayHeight)
        }
    }

    async deleteLayout(id) {
        dialog.showMessageBox(this.#win, {
            type: 'question',
            title: 'Delete Layout?',
            message: 'Are you sure you want to delete this layout? This action cannot be undone.',
            buttons: ['Yes', 'No'],
        }).then(
            ({ response: ans }) => {
                if (ans === 0) {
                    this.#controller.layoutEngine.deleteLayout(id)
                }
            }
        )
    }

    async exportLayout(id) {
        const layout = this.#controller.layoutEngine.getLayoutById(id)
        const now = new Date()
        const date = now.toISOString().split('T')[0]
        const time = now.getHours().toString().padStart(2, '0') + now.getMinutes().toString().padStart(2, '0')

        const defaultFilename = path.join(
            app.getPath('downloads'),
            layout.name + ' ' + date + ' ' + time + '.plantemplate'
        )

        dialog.showSaveDialog(this.#win, {
            defaultPath: defaultFilename
        }).then((result) => {
            if (result.canceled) return
            
            try {
                fs.writeFileSync(result.filePath, JSON.stringify(layout, null, 2))
                shell.showItemInFolder(result.filePath)
            } catch(err) {
                dialog.showMessageBox(this.#win, {
                    type: 'error',
                    title: 'Unable to save file',
                    message: `Sorry, we were not able to save this plan to ${result.filePath} - is the file already open?`
                })
            }
        })
    }

    async importLayout() {
        dialog.showOpenDialog(this.#win, {
            filters: [
                { name: 'Plan Templates', extensions: ['plantemplate']}
            ],
            properties: ['openFile']
        }).then(result => {
            if (result.canceled) return

            fs.readFile(result.filePaths[0], 'utf8', (err, data) => {
                if (err) {
                    dialog.showMessageBox(this.#win,
                            {
                                title: 'Unable to read file',
                                type: 'error',
                                buttons: ['OK'],
                                message: 'Sorry, we were unable to read the file'
                            }
                        )

                    return
                }

                let templateData
                try {
                    templateData = JSON.parse(data)
                } catch (parseError) {
                    console.error('Error parsing JSON data:', parseError)
                    dialog.showMessageBox(this.#win,
                        {
                            title: 'Unable to read file',
                            type: 'error',
                            buttons: ['OK'],
                            message: 'Sorry, this file appears to be corrupted'
                        }
                    )
                    return
                }

                const ajv = new Ajv()

                const isDataValid = ajv.validate(TEMPLATE_SCHEMA_FILE, templateData)
                if (!isDataValid) {
                    console.error('JSON data does not match schema:', ajv.errors)
                    dialog.showMessageBox(this.#win,
                        {
                            title: 'Unable to read file',
                            type: 'error',
                            buttons: ['OK'],
                            message: 'Sorry, this file appears to be corrupted'
                        }
                    )
                    return
                }

                const idExists = this.#controller.layoutEngine.layoutExists(templateData.id)
                let newLayout
                if (idExists) {
                    const ans = dialog.showMessageBoxSync(this.#win, {
                        type: 'question',
                        title: 'Overwrite existing template?',
                        message: 'A template with the same ID already exists. Do you want to overwrite it, or import this as a new template?',
                        buttons: ['New template','Overwrite'],
                        noLink: true,
                    })
                    if (ans == 0) {
                        newLayout = this.#controller.layoutEngine.importLayout(templateData, true)
                    } else {
                        newLayout = this.#controller.layoutEngine.importLayout(templateData, false)
                    }
                } else {
                    newLayout = this.#controller.layoutEngine.importLayout(templateData, false)
                }

                dialog.showMessageBox(this.#win, {
                    type: 'question',
                    title: 'Layout Imported',
                    message: 'Do you want to edit the new layout?',
                    buttons: ['Yes', 'No'],
                }).then(
                    ({ response: ans }) => {
                        if (ans === 0) {
                            this.#controller.selectedLayoutId = newLayout
                        }
                    }
                )
            })
        })
    }

}