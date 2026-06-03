import { app, BrowserWindow, shell } from 'electron'

export function showAboutWindow() {
    if (globalThis.AboutWindow && !globalThis.AboutWindow.isDestroyed()) {
        globalThis.AboutWindow.show()
        return
    }

    globalThis.AboutWindow = createAboutWindow()
}

function createAboutWindow() {
    const aboutWindow = new BrowserWindow({
        title: app.getName(),
        modal: true,
        show: false,
        webPreferences: {
            preload: ABOUT_PRELOAD_WEBPACK_ENTRY,
        }
    })

    aboutWindow.menuBarVisible = false
    aboutWindow.webContents.setWindowOpenHandler(({ url }) => {
        // Open urls with target="_blank" in a browser
        shell.openExternal(url)
        return { action: 'deny' }
    })
    aboutWindow.loadURL(ABOUT_WEBPACK_ENTRY)
    aboutWindow.once('ready-to-show', () => {
        aboutWindow.show()
    })
    return aboutWindow
}