const { app, BaseWindow, WebContentsView } = require('electron');
const path = require('node:path');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = () => {
  const win = new BaseWindow({width: 800, height: 600})

  const leftView = new WebContentsView({
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    }
  })
  leftView.webContents.loadURL(MAIN_WINDOW_WEBPACK_ENTRY)
  win.contentView.addChildView(leftView)

  const rightView = new WebContentsView({
  })
  rightView.webContents.loadURL('https://electronjs.org')
  win.contentView.addChildView(rightView)

  leftView.setBounds({ x: 0, y: 0, width: 400, height: 600 })
  rightView.setBounds({ x: 400, y: 0, width: 400, height: 600 })
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
