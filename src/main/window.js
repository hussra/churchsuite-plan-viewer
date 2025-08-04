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

import { app, nativeImage, Menu, BaseWindow, WebContentsView, shell, BrowserWindow } from 'electron'
import { WINDOW_WIDTH, WINDOW_HEIGHT, LEFT_PANEL_WIDTH, BAR_WIDTH } from './constants.js'
import path from 'path'
import { controller } from './main.js'

export var leftView, rightView, win

export const createWindow = () => {

    win = new BaseWindow({
        width: WINDOW_WIDTH,
        height: WINDOW_HEIGHT,
        useContentSize: true,
        resizable: false, // TODO: Make resizable and remember size
        backgroundColor: 'silver',
        title: 'ChurchSuite Plan Viewer'
    })
    win.setIcon(getIcon())

    leftView = new WebContentsView({
        webPreferences: {
            preload: LEFT_PANE_PRELOAD_WEBPACK_ENTRY,
        }
    })
    leftView.webContents.loadURL(LEFT_PANE_WEBPACK_ENTRY)
    win.contentView.addChildView(leftView)

    rightView = new WebContentsView({
        webPreferences: {
            preload: RIGHT_PANE_PRELOAD_WEBPACK_ENTRY,
        }
    })
    rightView.webContents.loadURL(RIGHT_PANE_WEBPACK_ENTRY)
    win.contentView.addChildView(rightView)

    leftView.setBounds({
        x: 0,
        y: 0,
        width: LEFT_PANEL_WIDTH,
        height: WINDOW_HEIGHT
    })
    rightView.setBounds({
        x: LEFT_PANEL_WIDTH + BAR_WIDTH,
        y: 0,
        width: WINDOW_WIDTH - LEFT_PANEL_WIDTH - BAR_WIDTH,
        height: WINDOW_HEIGHT
    })

    controller.on('viewChanged', () => {
        rightView.webContents.send('setPlan', {
            show: controller.showPlanView,
            title: controller.selectedPlanTitle,
            html: controller.selectedPlanHtml
        })
    })

    controller.on('configChanged', (connected) => {
        leftView.webContents.send('setConnected', connected)
    })

    controller.on('plansChanged', (plans) => {
        leftView.webContents.send('setPlans', plans)
    })
}


export const createMenu = () => {

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
                            parent: win,
                            title: app.getName(),
                            modal: true,
                            show: false,
                            webPreferences: {
                                preload: ABOUT_PANE_PRELOAD_WEBPACK_ENTRY,
                            }
                        })

                        about.menuBarVisible = false
                        about.webContents.setWindowOpenHandler(({ url }) => {
                            // Open urls with target="_blank" in a browser
                            shell.openExternal(url);
                            return { action: 'deny' };
                        });
                        about.loadURL(ABOUT_PANE_WEBPACK_ENTRY)
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
                    click: async () => { leftView.webContents.openDevTools({ mode: 'detach' }) }
                },
                {
                    label: 'Right',
                    click: async () => { rightView.webContents.openDevTools({ mode: 'detach' }) }
                }
            ]
        })
    }

    const menu = Menu.buildFromTemplate(menuTemplate)
    Menu.setApplicationMenu(menu)
}


function getIcon() {
    const assetsPath = app.isPackaged ? path.join(process.resourcesPath, "app", "assets") : "assets";
    return nativeImage.createFromPath(path.join(assetsPath, 'icon.ico'))
}