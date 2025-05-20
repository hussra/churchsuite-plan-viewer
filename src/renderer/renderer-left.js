/**
 * This file will automatically be loaded by webpack and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/tutorial/process-model
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.js` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */

import './left.css';

console.log('👋 This message is being logged by "renderer-left.js", included via webpack');

const populatePlans = async () => {
    // Remove all but '--Select plan--'
    for (const el of document.querySelectorAll('#plan option')) {
        if (el.value !== '') {
            el.remove()
        }
    }

    const plans = await window.electronAPI.getPlans()
    const planSelect = document.getElementById('plan')

    for (let i in plans) {
        let option = document.createElement('option')
        option.innerHTML = plans[i].date
        option.setAttribute('value', plans[i].id)
        planSelect.append(option)
    }
}

const load = async () => {
    await populatePlans()
}

load()
