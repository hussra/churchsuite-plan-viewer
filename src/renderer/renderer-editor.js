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

import './left.css'
import 'bootstrap'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.min.css'

const populateTemplates = (templates) => {

    const templateSelect = document.getElementById('template')
    const selectedTemplate = templateSelect.value

    // Remove all but '--Select plan--'
    for (const el of document.querySelectorAll('#template option')) {
        if (el.value !== '') {
            el.remove()
        }
    }

    let haveSelected = false
    for (let i in templates) {
        let option = document.createElement('option')
        option.innerHTML = templates[i].name + (!(templates[i].editable) ? ' (read-only)' : '')
        option.setAttribute('value', templates[i].id)
        templateSelect.append(option)
        if (templates[i].id == selectedTemplate) {
            templateSelect.value = selectedTemplate
            haveSelected = true
        }
    }

    templateSelect.dispatchEvent(new Event('change'))
}

const load = async () => {
    let templates = await window.electronAPI.getTemplates()
    alert(JSON.stringify(templates))
    populateTemplates(templates)
}

load()