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

import './editor.css'
import 'bootstrap'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.min.css'
import '@alenaksu/json-viewer'

const populateLayouts = async (layouts, newLayoutId) => {

    const layoutSelect = document.getElementById('layout')
    const selectedLayout = layoutSelect.value

    // Remove all but '--Select plan--'
    for (const el of document.querySelectorAll('#layout option')) {
        if (el.value !== '') {
            el.remove()
        }
    }

    for (let i in layouts) {
        let option = document.createElement('option')
        option.innerHTML = layouts[i].name
        option.setAttribute('value', layouts[i].id)
        layoutSelect.append(option)
        if (layouts[i].id == selectedLayout) {
            layoutSelect.value = selectedLayout
        }
    }

    layoutSelect.value = await window.electronAPI.getGlobalSetting('layout')

    layoutSelect.dispatchEvent(new Event('change'))
}


const populateForm = (layout) => {
    if (layout == null) {
        document.getElementById('name').value = ''
        document.getElementById('filenameSuffix').value = ''
        document.getElementById('liquid').value = ''
        document.getElementById('css').value = ''
        document.getElementById('hide_settings').value = ''
        document.getElementById('duplicateButton').setAttribute('disabled', 'disabled')        
    } else {
        document.getElementById('name').value = layout.name
        document.getElementById('filenameSuffix').value = layout.filenameSuffix
        document.getElementById('liquid').value = layout.liquid
        document.getElementById('css').value = layout.css
        document.getElementById('hide_settings').value = layout.hide_settings
        document.getElementById('duplicateButton').removeAttribute('disabled')
    }

    if (layout == null || !layout.editable) {
        document.getElementById('name').setAttribute('disabled', 'disabled')
        document.getElementById('filenameSuffix').setAttribute('disabled', 'disabled')
        document.getElementById('liquid').setAttribute('disabled', 'disabled')
        document.getElementById('css').setAttribute('disabled', 'disabled')
        document.getElementById('hide_settings').setAttribute('disabled', 'disabled')
        document.getElementById('deleteButton').setAttribute('disabled', 'disabled')
        document.getElementById('saveButton').setAttribute('disabled', 'disabled')
        document.getElementById('exportButton').setAttribute('disabled', 'disabled')
    } else {
        document.getElementById('name').removeAttribute('disabled')
        document.getElementById('filenameSuffix').removeAttribute('disabled')
        document.getElementById('liquid').removeAttribute('disabled')
        document.getElementById('css').removeAttribute('disabled')
        document.getElementById('hide_settings').removeAttribute('disabled')
        document.getElementById('deleteButton').removeAttribute('disabled')
        document.getElementById('saveButton').removeAttribute('disabled')
        document.getElementById('exportButton').removeAttribute('disabled')
    }
}


window.electronAPI.onsetLayouts(async (layouts, newLayoutId) => {
    populateLayouts(layouts, newLayoutId)
})


window.electronAPI.onSetLayout(async (layoutId) => {
    document.getElementById('layout').value = layoutId
    populateForm(await window.electronAPI.getLayout(layoutId))
})


window.electronAPI.onSetPlan((plan) => {
    const viewer = document.getElementById('json')
    viewer.data = plan
    viewer.expand('plan')
})


const load = async () => {
    let layouts = await window.electronAPI.getAllLayouts()
    populateLayouts(layouts)

    document.getElementById('layout').addEventListener('change', async (event) => {
        const layoutId = event.target.value
        populateForm(await window.electronAPI.getLayout(layoutId))
        await window.electronAPI.selectLayout(layoutId)
    })

    document.getElementById('saveButton').addEventListener('click', async (event) => {
        const layout = {
            id: document.getElementById('layout').value,
            name: document.getElementById('name').value,
            filenameSuffix: document.getElementById('filenameSuffix').value,
            liquid: document.getElementById('liquid').value,
            css: document.getElementById('css').value,
            hide_settings: document.getElementById('hide_settings').value,
            editable: true
        }
        await window.electronAPI.saveLayout(layout)
    })

    document.getElementById('deleteButton').addEventListener('click', async (event) => {
        const layoutId = document.getElementById('layout').value
        await window.electronAPI.deleteLayout(layoutId)
    })

    document.getElementById('duplicateButton').addEventListener('click', async (event) => {
        const layoutId = document.getElementById('layout').value
        await window.electronAPI.duplicateLayout(layoutId)
    })

    document.getElementById('exportButton').addEventListener('click', async(event) => {
        const layoutId = document.getElementById('layout').value
        await window.electronAPI.exportLayout(layoutId)
    })

    document.getElementById('importButton').addEventListener('click', async (event) => {
        await window.electronAPI.importLayout()
    })

    populateForm(null)
}


load()