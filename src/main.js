const { app, Menu, BaseWindow, WebContentsView } = require('electron')
const path = require('node:path')
const constants = require('./constants')
const ipcHandlers = require('./ipcHandlers')

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit()
}

let leftView, rightView

const createWindow = () => {
  const win = new BaseWindow({width: constants.WINDOW_WIDTH, height: constants.WINDOW_HEIGHT, backgroundColor: 'silver'})

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
    width: constants.LEFT_PANEL_WIDTH,
    height: constants.WINDOW_HEIGHT
  })
  rightView.setBounds({
    x: constants.LEFT_PANEL_WIDTH + constants.BAR_WIDTH,
    y: 0,
    width: constants.WINDOW_WIDTH - constants.LEFT_PANEL_WIDTH - constants.BAR_WIDTH,
    height: constants.WINDOW_HEIGHT
  })
}

const createMenu = () => {

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

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  ipcHandlers.addIpcHandlers()
  createWindow()
  createMenu()

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
