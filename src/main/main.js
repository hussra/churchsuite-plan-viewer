import { app, dialog } from 'electron'
import * as path from 'node:path'
import { addIpcHandlers } from './ipcHandlers'
import { getPlanDetail, getPlanItems } from './api.js'
import { Liquid } from 'liquidjs'
import * as fs from 'fs'
import { shell } from 'electron'
import coherentpdf from 'coherentpdf'
import { createWindow, createMenu, leftView, rightView, win } from './window.js'
import { Controller } from './controller.js'

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit()
}

export let controller = new Controller()

controller.on('viewChanged', () => {
  rightView.webContents.send('setPlan', {
    show: controller.showPlan,
    title: controller.title,
    html: controller.html
  })
})

export async function exportPDF() { // TODO: Move this somewhere else
  dialog.showSaveDialog(win, {
    defaultPath: path.join(app.getPath('downloads'), controller.plan.date + '.pdf')
  }).then((result) => {
    if (result.cancelled) return

    let pdf
    let mergedPdf

    rightView.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4'
    }).then(data => {

      let twoUp = true // TODO take this from preferences!

      if (twoUp) {
        pdf = coherentpdf.fromMemory(data, '')
        mergedPdf = coherentpdf.mergeSimple([pdf, pdf])
        coherentpdf.twoUp(mergedPdf)
        coherentpdf.rotate(mergedPdf, coherentpdf.all(mergedPdf), 90)
        coherentpdf.toFile(twoUp ? mergedPdf : pdf, result.filePath, false, false)
      } else {
        fs.writeFileSync(result.filePath, data)
      }

      shell.openPath(result.filePath)
    }).catch((err) => {
      dialog.showMessageBox(win, {
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


// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  addIpcHandlers()
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
