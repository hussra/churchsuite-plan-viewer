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

// Inspiration: https://medium.com/@hql287/persisting-windows-state-in-electron-using-javascript-closure-17fc0821d37

import { screen } from 'electron'

export function windowStateKeeper(windowName, controller, defaultWindowSize) {
    let window, windowState

    function setBounds() {
        windowState = controller.getGlobalSetting(`windowState.${windowName}`)

        // Restore from settings
        if (windowState && isOnScreen()) return

        // Default
        windowState = {
            x: undefined,
            y: undefined,
            width: defaultWindowSize.width,
            height: defaultWindowSize.height
        }
    }

    function isOnScreen() {
        for (const display of screen.getAllDisplays()) {
            if (boundsOverlap(display.bounds, windowState, 25)) {
                return true
            }
        }
        return false
    }

    function boundsOverlap(display, windowState, minOverlap) {
        const displayTopLeft = {
            x: display.x + minOverlap,
            y: display.y + minOverlap
        }
        const displayBottomRight = {
            x: display.x + display.width - 1 - minOverlap,
            y: display.y + display.height - 1 - minOverlap
        }
        const windowBottomRight = {
            x: windowState.x + windowState.width - 1,
            y: windowState.y + windowState.height - 1
        }

        if (windowBottomRight.x < displayTopLeft.x) return false
        if (windowBottomRight.y < displayTopLeft.y) return false
        if (windowState.x > displayBottomRight.x) return false
        if (windowState.y > displayBottomRight.y) return false
        return true
    }

    function saveState() {
        windowState = window.isMaximized() ? window.getNormalBounds() : window.getBounds()
        windowState.isMaximized = window.isMaximized()
        controller.setGlobalSetting(`windowState.${windowName}`, windowState)
    }

    function track(win) {
        window = win;
        ['resize', 'move', 'close', 'maximize', 'unmaximize'].forEach(event => {
            win.on(event, saveState)
        })
    }

    setBounds()

    return ({
        x: windowState.x,
        y: windowState.y,
        width: windowState.width,
        height: windowState.height,
        isMaximized: windowState.isMaximized,
        track
    })
}