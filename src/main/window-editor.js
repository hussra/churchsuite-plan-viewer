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

import { app, BrowserWindow, Menu, screen } from 'electron'

import { WINDOW_WIDTH, WINDOW_HEIGHT } from './constants'

export class EditorWindow {

    constructor(controller) {
        this.#controller = controller

        const defaultWindowSize = this.#getDefaultWindowSize()

        this.#win = new BrowserWindow({
            width: defaultWindowSize.width,
            height: defaultWindowSize.height,
            title: app.getName() + ' - Template Editor',
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

        this.#controller.on('templateChanged', () => {
            if (!this.isDestroyed()) {
                this.#win.webContents.send('setTemplate', this.#controller.selectedTemplateId)
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
}