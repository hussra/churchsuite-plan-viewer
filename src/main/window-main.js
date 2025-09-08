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

import * as fs from 'fs'
import path from 'path'
import { app, BaseWindow, BrowserWindow, dialog, Menu, nativeImage, screen, shell, WebContentsView } from 'electron'
import coherentpdf from 'coherentpdf'

import { WINDOW_WIDTH, WINDOW_HEIGHT, LEFT_PANEL_WIDTH, BAR_WIDTH } from './constants'

export class MainWindow {

    constructor(controller) {
        this.#controller = controller

        const defaultWindowSize = this.#getDefaultWindowSize()
        this.#win = new BaseWindow({
            width: defaultWindowSize.width,
            height: defaultWindowSize.height,
            backgroundColor: 'silver',
            title: 'ChurchSuite Plan Viewer'
        })

        this.#win.setIcon(this.#getIcon())
        this.#win.setMenu(this.#createMenu())

        this.#leftView = new WebContentsView({
            webPreferences: {
                preload: LEFT_PANE_PRELOAD_WEBPACK_ENTRY,
            }
        })
        this.#leftView.webContents.loadURL(LEFT_PANE_WEBPACK_ENTRY)
        this.#win.contentView.addChildView(this.#leftView)

        this.#rightView = new WebContentsView({
            webPreferences: {
                preload: RIGHT_PANE_PRELOAD_WEBPACK_ENTRY,
            }
        })
        this.#rightView.webContents.loadURL(RIGHT_PANE_WEBPACK_ENTRY)
        this.#win.contentView.addChildView(this.#rightView)
        
        const contextMenu = Menu.buildFromTemplate([
            { role: 'selectAll' },
            { role: 'copy' }
        ])
        this.#rightView.webContents.on('context-menu', (e, params) => {
            contextMenu.popup()
        })

        this.#win.on('resized', () => { this.resizePanes() })
        this.#win.on('maximize', () => { this.resizePanes() })
        this.#win.on('unmaximize', () => { this.resizePanes() })

        this.#win.on('close', () => {
            if (globalThis.editorWindow && !globalThis.editorWindow.isDestroyed()) {
                globalThis.editorWindow.hide()
            }
        })

        this.#controller.on('viewChanged', async () => {
            this.#rightView.webContents.send('setPlan', {
                show: this.#controller.showPlanView,
                html: this.#controller.selectedPlanHtml
            })

            if (this.#css != '') {
                this.#rightView.webContents.removeInsertedCSS(this.#css)
            }
            this.#css = await this.#rightView.webContents.insertCSS(this.#controller.selectedPlanCss)
            this.resizePanes()
        })

        this.#controller.on('configChanged', (connected) => {
            this.#leftView.webContents.send('setConnected', connected)
        })

        this.#controller.on('plansChanged', () => {
            this.#leftView.webContents.send('setPlans', this.#controller.allPlans)
        })

        this.#controller.on('templatesChanged', () => {
            this.#leftView.webContents.send('setTemplates', this.#controller.allTemplates)
        })

        this.#win.show()

        // Hacky, but ensures bottom scrollbar button appears.
        // Somehow win.getContentSize() doesn't include menu bar height
        // at first, but does a little later.
        setTimeout(() => { this.resizePanes() }, 100)
    }


    #controller
    #leftView
    #rightView
    #win
    #css = ''


    resizePanes() {
        const [width, height] = this.#win.getContentSize()

        this.#leftView.setBounds({
            x: 0,
            y: 0,
            width: LEFT_PANEL_WIDTH,
            height: height
        })

        this.#rightView.setBounds({
            x: LEFT_PANEL_WIDTH + BAR_WIDTH,
            y: 0,
            width: width - LEFT_PANEL_WIDTH - BAR_WIDTH,
            height: height
        })
    }


    #getDefaultWindowSize() {
        const primaryDisplay = screen.getPrimaryDisplay()
        const { width: displayWidth, height: displayHeight } = primaryDisplay.workAreaSize

        return {
            width: Math.min(WINDOW_WIDTH, displayWidth),
            height: Math.min(WINDOW_HEIGHT, displayHeight)
        }
    }


    #createMenu() {

        const isMac = process.platform === 'darwin'
        let menuTemplate = [
            {
                label: 'File',
                submenu: [
                    isMac ? { role: 'close' } : { role: 'quit' }
                ]
            },
            {
                role: 'help',
                submenu: [
                    {
                        label: 'About...',
                        click: async () => {
                            const about = new BrowserWindow({
                                parent: this.#win,
                                title: app.getName(),
                                modal: true,
                                show: false,
                                webPreferences: {
                                    preload: ABOUT_PRELOAD_WEBPACK_ENTRY,
                                }
                            })

                            about.menuBarVisible = false
                            about.webContents.setWindowOpenHandler(({ url }) => {
                                // Open urls with target="_blank" in a browser
                                shell.openExternal(url);
                                return { action: 'deny' };
                            });
                            about.loadURL(ABOUT_WEBPACK_ENTRY)
                            about.once('ready-to-show', () => {
                                about.show()
                            })
                        }
                    }
                ]
            }
        ]

        if (!app.isPackaged) {
            menuTemplate.splice(1, 0, {
                label: 'Inspect',
                submenu: [
                    {
                        label: 'Left',
                        click: async () => { this.#leftView.webContents.openDevTools({ mode: 'detach' }) }
                    },
                    {
                        label: 'Right',
                        click: async () => { this.#rightView.webContents.openDevTools({ mode: 'detach' }) }
                    }
                ]
            })
        }

        return Menu.buildFromTemplate(menuTemplate)
    }


    #getIcon() {
        const assetsPath = app.isPackaged ? path.join(process.resourcesPath, "app", "assets") : "assets";
        return nativeImage.createFromPath(path.join(assetsPath, 'icon.ico'))
    }


    async exportPDF() {
        const template = this.#controller.template
        const twoUp = this.#controller.getSetting('two_up')

        const defaultFilename = path.join(
            app.getPath('downloads'),
            this.#controller.selectedPlan.plan.detail.date + template.filenameSuffix + (twoUp ? '-2up' : '') + '.pdf'
        )

        dialog.showSaveDialog(this.#win, {
            defaultPath: defaultFilename
        }).then((result) => {
            if (result.canceled) return

            let pdf
            let mergedPdf

            this.#rightView.webContents.printToPDF({
                printBackground: true,
                pageSize: this.#controller.getSetting('page_size')
            }).then(data => {

                if (twoUp) {
                    // Load the PDF file
                    pdf = coherentpdf.fromMemory(data, '')

                    // Duplicate each page - 1, 1, 2, 2, etc.
                    mergedPdf = coherentpdf.mergeSame(
                        [pdf], false, false,
                        [coherentpdf.all(pdf).flatMap(i => [i, i])]
                    )

                    // Two-up and rotate
                    coherentpdf.twoUp(mergedPdf)
                    coherentpdf.rotate(mergedPdf, coherentpdf.all(mergedPdf), 90)

                    // Save to file
                    coherentpdf.toFile(mergedPdf, result.filePath, false, false)
                } else {
                    // 1-up - just save it!
                    fs.writeFileSync(result.filePath, data)
                }

                shell.openPath(result.filePath)
            }).catch((err) => {
                dialog.showMessageBox(this.#win, {
                    type: 'error',
                    title: 'Unable to save file',
                    message: `Sorry, we were not able to save this plan to ${result.filePath} - is the file already open?`
                })
            }).finally(() => {
                coherentpdf.deletePdf(mergedPdf)
                coherentpdf.deletePdf(pdf)
            })
        })
    }

}