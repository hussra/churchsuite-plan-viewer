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

const populatePlans = async (plans) => {

    const planSelect = document.getElementById('plan')
    const selectedPlan = planSelect.value

    // Remove all but '--Select plan--'
    for (const el of document.querySelectorAll('#plan option')) {
        if (el.value !== '') {
            el.remove()
        }
    }

    let haveSelected = false
    for (let i in plans) {
        let option = document.createElement('option')
        option.innerHTML = plans[i].name
        option.setAttribute('value', plans[i].id)
        planSelect.append(option)
        if (plans[i].id == selectedPlan) {
            planSelect.value = selectedPlan
            haveSelected = true
        }
    }
    if ((!haveSelected) && (plans.length > 0)) {
        planSelect.value = plans[0].id
    }

    selectPlan()
}

const populateTemplates = async (templates) => {

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
        option.innerHTML = templates[i].name
        option.setAttribute('value', templates[i].id)
        templateSelect.append(option)
        if (templates[i].id == selectedTemplate) {
            templateSelect.value = selectedTemplate
            haveSelected = true
        }
    }
    if ((!haveSelected) && (templates.length > 0)) {
        templateSelect.value = await window.electronAPI.getGlobalSetting('template')
    }

    if (templateSelect.value != selectedTemplate) {
        selectTemplate()
    }
}

const exportPDF = () => {
    window.electronAPI.exportPDF()
}

const editTemplates = () => {
    window.electronAPI.editTemplates()
}

const selectPlan = (event) => {
    const planId = document.getElementById('plan').value
    window.electronAPI.selectPlan(planId)
}

const selectTemplate = (event) => {
    const templateId = document.getElementById('template').value
    window.electronAPI.selectTemplate(templateId)
}

const loadSettings = async () => {
    // Global settings
    const past_plans = await window.electronAPI.getGlobalSetting('past_plans')
    document.getElementById('past_plans').checked = past_plans

    const draft_plans = await window.electronAPI.getGlobalSetting('draft_plans')
    document.getElementById('draft_plans').checked = draft_plans

    const plans_quantity = await window.electronAPI.getGlobalSetting('plans_quantity')
    document.getElementById('plans_quantity').value = plans_quantity

    const ccli_licence = await window.electronAPI.getGlobalSetting('ccli_licence')
    document.getElementById('ccli_licence').value = ccli_licence

    // Authentication settings
    const client_secret = await window.electronAPI.getGlobalSetting('client_secret')
    document.getElementById('client_secret').value = client_secret

    const client_id = await window.electronAPI.getGlobalSetting('client_id')
    document.getElementById('client_id').value = client_id
}

const showHideSettings = (connected) => {
    if (connected) {
        document.getElementById('mainControls').classList.remove('d-none')
        document.getElementById('authenticationSettings').classList.remove('show')
    } else {
        document.getElementById('mainControls').classList.add('d-none')
        document.getElementById('authenticationSettings').classList.add('show')
    }
}

const refresh = () => {
    window.electronAPI.refresh()
}

window.electronAPI.onSetConnected((connected) => {
    showHideSettings(connected)
})

window.electronAPI.onSetPlans((plans) => {
    populatePlans(plans)
})

window.electronAPI.onSetTemplates((templates) => {
    populateTemplates(templates)
})

window.electronAPI.onSetTemplate(async(templateId) => {
    document.getElementById('template').value = templateId

    const font_size = await window.electronAPI.getTemplateSetting('font_size')
    document.getElementById('font_size').value = font_size

    const name_style = await window.electronAPI.getTemplateSetting('name_style')
    document.getElementById('name_style').value = name_style

    const song_lyrics = await window.electronAPI.getTemplateSetting('song_lyrics')
    document.getElementById('song_lyrics').checked = song_lyrics

    const page_size = await window.electronAPI.getTemplateSetting('page_size')
    document.querySelector('#page_size option[value=' + page_size + ']').selected = true

    const two_up = await window.electronAPI.getTemplateSetting('two_up')
    document.getElementById('two_up').checked = two_up

    const page_numbers = await window.electronAPI.getTemplateSetting('page_numbers')
    document.getElementById('page_numbers').checked = page_numbers
})

const load = async () => {
    // Set up event handlers

    // Plan and template selection
    document.getElementById('plan').addEventListener('change', selectPlan)
    document.getElementById('refreshButton').addEventListener('click', refresh)
    document.getElementById('template').addEventListener('change', selectTemplate)
    document.getElementById('editButton').addEventListener('click', editTemplates)

    // Global settings
    document.getElementById('past_plans').addEventListener('change', async () => {
        await window.electronAPI.setGlobalSetting('past_plans', document.getElementById('past_plans').checked)
        refresh()
    })
    document.getElementById('draft_plans').addEventListener('change', async () => {
        await window.electronAPI.setGlobalSetting('draft_plans', document.getElementById('draft_plans').checked)
        refresh()
    })
    document.getElementById('plans_quantity').addEventListener('change', async () => {
        await window.electronAPI.setGlobalSetting('plans_quantity', parseInt(document.getElementById('plans_quantity').value))
        refresh()
    })
    document.getElementById('ccli_licence').addEventListener('change', async () => {
        await window.electronAPI.setGlobalSetting('ccli_licence', parseInt(document.getElementById('ccli_licence').value))
        refresh()
    })

    // Template settings
    document.getElementById('font_size').addEventListener('change', async () => {
        await window.electronAPI.setTemplateSetting('font_size', parseInt(document.getElementById('font_size').value))
        refresh()
    })
    document.getElementById('name_style').addEventListener('change', async () => {
        await window.electronAPI.setTemplateSetting('name_style', document.getElementById('name_style').value)
        refresh()
    })
    document.getElementById('song_lyrics').addEventListener('change', async () => {
        await window.electronAPI.setTemplateSetting('song_lyrics', document.getElementById('song_lyrics').checked)
        refresh()
    })
    document.getElementById('page_size').addEventListener('change', async () => {
        await window.electronAPI.setTemplateSetting('page_size', document.getElementById('page_size').value)
    })
    document.getElementById('two_up').addEventListener('change', async () => {
        await window.electronAPI.setTemplateSetting('two_up', document.getElementById('two_up').checked)
    })
    document.getElementById('page_numbers').addEventListener('change', async () => {
        await window.electronAPI.setTemplateSetting('page_numbers', document.getElementById('page_numbers').checked)
        refresh()
    })

    // Authentication settings
    document.getElementById('client_secret').addEventListener('change', async () => {
        await window.electronAPI.setGlobalSetting('client_secret', document.getElementById('client_secret').value)
    })
    document.getElementById('client_id').addEventListener('change', async () => {
        await window.electronAPI.setGlobalSetting('client_id', document.getElementById('client_id').value)
    })

    // Export PDF button
    document.getElementById('exportPDF').addEventListener('click', exportPDF)

    await loadSettings()

    window.electronAPI.leftRendererStartupComplete()
}

load()
