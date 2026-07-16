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