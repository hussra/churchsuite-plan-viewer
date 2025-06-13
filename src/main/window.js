import { app, nativeImage, Menu, BaseWindow, WebContentsView } from 'electron'
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
    const menuTemplate = [
        {
            label: 'File',
            submenu: [
                isMac ? { role: 'close' } : { role: 'quit' }
            ]
        },
        {
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
        },
        {
            role: 'help',
            submenu: [
                {
                    label: 'About...',
                    click: async () => {
                        const { shell } = require('electron')
                        await shell.openExternal('https://electronjs.org')
                    }
                }
            ]
        }
    ]

    const menu = Menu.buildFromTemplate(menuTemplate)
    Menu.setApplicationMenu(menu)
}


function getIcon() {
    const assetsPath = app.isPackaged ? path.join(process.resourcesPath, "app", "assets") : "assets";
    return nativeImage.createFromPath(path.join(assetsPath, 'icon.png'))
}