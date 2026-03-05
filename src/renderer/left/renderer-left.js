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

const populateLayouts = async (layouts) => {

    const layoutSelect = document.getElementById('layout')
    const selectedLayout = layoutSelect.value

    // Remove all but '--Select plan--'
    for (const el of document.querySelectorAll('#layout option')) {
        if (el.value !== '') {
            el.remove()
        }
    }

    let haveSelected = false
    for (let i in layouts) {
        let option = document.createElement('option')
        option.innerHTML = layouts[i].name
        option.setAttribute('value', layouts[i].id)
        layoutSelect.append(option)
        if (layouts[i].id == selectedLayout) {
            layoutSelect.value = selectedLayout
            haveSelected = true
        }
    }
    if ((!haveSelected) && (layouts.length > 0)) {
        layoutSelect.value = await window.electronAPI.getGlobalSetting('layout')
    }

    if (layoutSelect.value != selectedLayout) {
        selectLayout()
    }
}

const exportPDF = () => {
    window.electronAPI.exportPDF()
}

const editLayouts = () => {
    window.electronAPI.editLayouts()
}

const selectPlan = (event) => {
    const planId = document.getElementById('plan').value
    window.electronAPI.selectPlan(planId)
}

const selectLayout = (event) => {
    const layoutId = document.getElementById('layout').value
    window.electronAPI.selectLayout(layoutId)
}

const loadSettings = async () => {
    // Global settings
    const show_templates = await window.electronAPI.getGlobalSetting('show_templates')
    document.getElementById('show_templates').checked = show_templates
    document.getElementById('past_plans').closest('.form-group').classList.toggle('d-none', show_templates)
    document.getElementById('draft_plans').closest('.form-group').classList.toggle('d-none', show_templates)

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

const showHideControls = (connected) => {
    if (connected) {
        document.getElementById('mainControlsTop').classList.remove('d-none')
        document.getElementById('mainControlsBottom').classList.remove('d-none')
        document.getElementById('globalSettingsAccordionItem').classList.remove('d-none')
        document.getElementById('layoutSettingsAccordionItem').classList.remove('d-none')
        document.getElementById('authenticationSettings').classList.remove('show')
    } else {
        document.getElementById('mainControlsTop').classList.add('d-none')
        document.getElementById('mainControlsBottom').classList.add('d-none')
        document.getElementById('globalSettingsAccordionItem').classList.add('d-none')
        document.getElementById('layoutSettingsAccordionItem').classList.add('d-none')
        document.getElementById('authenticationSettings').classList.add('show')
    }
}

const refresh = () => {
    window.electronAPI.refresh()
}

window.electronAPI.onSetConnected((connected) => {
    showHideControls(connected)
})

window.electronAPI.onSetPlans((plans) => {
    populatePlans(plans)
})

window.electronAPI.onsetLayouts((layouts) => {
    populateLayouts(layouts)
})

window.electronAPI.onSetLayout(async(layoutId) => {
    document.getElementById('layout').value = layoutId

    const font_size = await window.electronAPI.getLayoutSetting('font_size')
    document.getElementById('font_size').value = font_size

    const name_style = await window.electronAPI.getLayoutSetting('name_style')
    document.getElementById('name_style').value = name_style

    const song_lyrics = await window.electronAPI.getLayoutSetting('song_lyrics')
    document.getElementById('song_lyrics').checked = song_lyrics

    const timings = await window.electronAPI.getLayoutSetting('timings')
    document.getElementById('timings').checked = timings

    const time_format = await window.electronAPI.getLayoutSetting('time_format')
    const timeFormatOption = document.querySelector('#time_format option[value=' + CSS.escape(time_format)/*.replaceAll('%', '\\%').replaceAll(':', '\\:')*/ + ']')
    if (timeFormatOption) {
        timeFormatOption.selected = true
    }

    const page_size = await window.electronAPI.getLayoutSetting('page_size')
    const pageSizeOption = document.querySelector('#page_size option[value=' + page_size + ']')
    if (pageSizeOption) {
        pageSizeOption.selected = true
    }

    const two_up = await window.electronAPI.getLayoutSetting('two_up')
    document.getElementById('two_up').checked = two_up

    const page_numbers = await window.electronAPI.getLayoutSetting('page_numbers')
    document.getElementById('page_numbers').checked = page_numbers

    const hide_settings = await window.electronAPI.getLayoutSetting('hide_settings')
    showHideSetting('song_lyrics', !(hide_settings?.includes('song_lyrics')))
    showHideSetting('timings', !(hide_settings?.includes('timings')))
    showHideSetting('time_format', !(hide_settings?.includes('time_format')))
    showHideSetting('name_style', !(hide_settings?.includes('name_style')))
})

const load = async () => {
    // Set up event handlers

    // Sidebar width adjustment
    var dragging = false
    var windowWidth = await window.electronAPI.getWindowWidth() 

    window.electronAPI.onSetWidth((width) => {
        windowWidth = width
    })

    const constrain = (x) => {
        const minPos = 250
        const maxPos = Math.min(windowWidth - 250, 500)
        if (x < minPos) return minPos
        if (x > maxPos) return maxPos
        return x
    }

    var move = (e) => {
        if (!dragging) return
        window.electronAPI.dragbarMoved(constrain(e.pageX), false)
    }

    document.getElementById('dragbar').addEventListener('mousedown', (e) => {
        e.preventDefault()
        dragging = true
        document.addEventListener('mousemove', move)
    })

    document.addEventListener('mouseup', (e) => {
        if (dragging) {
            document.removeEventListener('mousemove', move)
            dragging = false
            window.electronAPI.dragbarMoved(constrain(e.pageX), true)
        }
    })

    // Plan and layout selection
    document.getElementById('plan').addEventListener('change', selectPlan)
    document.getElementById('refreshButton').addEventListener('click', refresh)
    document.getElementById('layout').addEventListener('change', selectLayout)
    document.getElementById('editButton').addEventListener('click', editLayouts)

    // Global settings
    document.getElementById('show_templates').addEventListener('change', async () => {
        const showTemplates = document.getElementById('show_templates').checked
        await window.electronAPI.setGlobalSetting('show_templates', showTemplates)
        document.getElementById('past_plans').closest('.form-group').classList.toggle('d-none', showTemplates)
        document.getElementById('draft_plans').closest('.form-group').classList.toggle('d-none', showTemplates)
        refresh()
    })
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

    // Layout settings
    document.getElementById('font_size').addEventListener('change', async () => {
        await window.electronAPI.setLayoutSetting('font_size', parseInt(document.getElementById('font_size').value))
        refresh()
    })
    document.getElementById('name_style').addEventListener('change', async () => {
        await window.electronAPI.setLayoutSetting('name_style', document.getElementById('name_style').value)
        refresh()
    })
    document.getElementById('song_lyrics').addEventListener('change', async () => {
        await window.electronAPI.setLayoutSetting('song_lyrics', document.getElementById('song_lyrics').checked)
        refresh()
    })
    document.getElementById('timings').addEventListener('change', async () => {
        await window.electronAPI.setLayoutSetting('timings', document.getElementById('timings').checked)
        refresh()
    })
    document.getElementById('time_format').addEventListener('change', async () => {
        await window.electronAPI.setLayoutSetting('time_format', document.getElementById('time_format').value)
        refresh()
    })
    document.getElementById('page_size').addEventListener('change', async () => {
        await window.electronAPI.setLayoutSetting('page_size', document.getElementById('page_size').value)
    })
    document.getElementById('two_up').addEventListener('change', async () => {
        await window.electronAPI.setLayoutSetting('two_up', document.getElementById('two_up').checked)
    })
    document.getElementById('page_numbers').addEventListener('change', async () => {
        await window.electronAPI.setLayoutSetting('page_numbers', document.getElementById('page_numbers').checked)
        refresh()
    })

    // Authentication settings
    document.getElementById('authHelpLink').addEventListener('click', async () => {
        await window.electronAPI.openAuthHelpLink()
    })
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

// Show or hide settings based on the selected layout's "hide_settings" property
const showHideSetting = (settingId, show) => {
    const element = document.getElementById(settingId).closest('.form-group')
    if (show) {
        element.classList.remove('d-none')
    } else {
        element.classList.add('d-none')
    }
}

load()
