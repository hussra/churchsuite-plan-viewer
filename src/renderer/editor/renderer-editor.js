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


const populateTemplates = async (templates, newTemplateId) => {

    const templateSelect = document.getElementById('template')
    const selectedTemplate = templateSelect.value

    // Remove all but '--Select plan--'
    for (const el of document.querySelectorAll('#template option')) {
        if (el.value !== '') {
            el.remove()
        }
    }

    for (let i in templates) {
        let option = document.createElement('option')
        option.innerHTML = templates[i].name
        option.setAttribute('value', templates[i].id)
        templateSelect.append(option)
        if (templates[i].id == selectedTemplate) {
            templateSelect.value = selectedTemplate
        }
    }

    templateSelect.value = await window.electronAPI.getFromStore('template')

    templateSelect.dispatchEvent(new Event('change'))
}


const populateForm = (template) => {
    if (template == null) {
        document.getElementById('name').value = ''
        document.getElementById('filenameSuffix').value = ''
        document.getElementById('liquid').value = ''
        document.getElementById('css').value = ''
        document.getElementById('duplicateButton').setAttribute('disabled', 'disabled')        
    } else {
        document.getElementById('name').value = template.name
        document.getElementById('filenameSuffix').value = template.filenameSuffix
        document.getElementById('liquid').value = template.liquid
        document.getElementById('css').value = template.css
        document.getElementById('duplicateButton').removeAttribute('disabled')
    }

    if (template == null || !template.editable) {
        document.getElementById('name').setAttribute('disabled', 'disabled')
        document.getElementById('filenameSuffix').setAttribute('disabled', 'disabled')
        document.getElementById('liquid').setAttribute('disabled', 'disabled')
        document.getElementById('css').setAttribute('disabled', 'disabled')
        document.getElementById('deleteButton').setAttribute('disabled', 'disabled')
        document.getElementById('saveButton').setAttribute('disabled', 'disabled')
    } else {
        document.getElementById('name').removeAttribute('disabled')
        document.getElementById('filenameSuffix').removeAttribute('disabled')
        document.getElementById('liquid').removeAttribute('disabled')
        document.getElementById('css').removeAttribute('disabled')
        document.getElementById('deleteButton').removeAttribute('disabled')
        document.getElementById('saveButton').removeAttribute('disabled')
    }
}


window.electronAPI.onSetTemplates(async (templates, newTemplateId) => {
    populateTemplates(templates, newTemplateId)
})


window.electronAPI.onSetTemplate(async (templateId) => {
    document.getElementById('template').value = templateId
    populateForm(await window.electronAPI.getTemplate(templateId))
})


window.electronAPI.onSetPlan((plan) => {
    document.getElementById('json').data = plan
})


const load = async () => {
    let templates = await window.electronAPI.getAllTemplates()
    populateTemplates(templates)

    document.getElementById('template').addEventListener('change', async (event) => {
        const templateId = event.target.value
        populateForm(await window.electronAPI.getTemplate(templateId))
        await window.electronAPI.selectTemplate(templateId)
    })

    document.getElementById('saveButton').addEventListener('click', async (event) => {
        const templateId = document.getElementById('template').value
        const name = document.getElementById('name').value
        const filenameSuffix = document.getElementById('filenameSuffix').value
        const liquid = document.getElementById('liquid').value
        const css = document.getElementById('css').value

        alert('Save not yet implemented')
    })

    document.getElementById('deleteButton').addEventListener('click', async (event) => {
        alert('Delete not yet implemented')
    })

    document.getElementById('duplicateButton').addEventListener('click', async (event) => {
        const templateId = document.getElementById('template').value
        const newTemplateId = await window.electronAPI.duplicateTemplate(templateId)
    })

    populateForm(null)
}


load()