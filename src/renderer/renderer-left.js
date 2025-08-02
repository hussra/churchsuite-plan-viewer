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

import './left.css';
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
        option.innerHTML = plans[i].date
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

    planSelect.dispatchEvent(new Event('change'))
}

const exportPDF = () => {
    window.electronAPI.exportPDF()
}

const selectPlan = (event) => {
    const planId = document.getElementById('plan').value
    window.electronAPI.selectPlan(planId)
}

const loadSettings = async () => {
    const client_secret = await window.electronAPI.getFromStore('client_secret')
    document.getElementById('client_secret').value = client_secret

    const client_id = await window.electronAPI.getFromStore('client_id')
    document.getElementById('client_id').value = client_id

    const past_plans = await window.electronAPI.getFromStore('past_plans')
    document.getElementById('past_plans').checked = past_plans

    const draft_plans = await window.electronAPI.getFromStore('draft_plans')
    document.getElementById('draft_plans').checked = draft_plans

    const plans_quantity = await window.electronAPI.getFromStore('plans_quantity')
    document.getElementById('plans_quantity').value = plans_quantity

    const two_up = await window.electronAPI.getFromStore('two_up')
    document.getElementById('two_up').checked = two_up

    const page_size = await window.electronAPI.getFromStore('page_size')
    document.querySelector('#page_size option[value=' + page_size + ']').selected = true
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

const load = async () => {
    document.getElementById('refreshButton').addEventListener('click', refresh)
    document.getElementById('plan').addEventListener('change', selectPlan)
    document.getElementById('exportPDF').addEventListener('click', exportPDF)

    document.getElementById('past_plans').addEventListener('change', async () => {
        await window.electronAPI.setInStore('past_plans', document.getElementById('past_plans').checked)
        refresh()
    })
    document.getElementById('draft_plans').addEventListener('change', async () => {
        await window.electronAPI.setInStore('draft_plans', document.getElementById('draft_plans').checked)
        refresh()
    })
    document.getElementById('plans_quantity').addEventListener('change', async () => {
        await window.electronAPI.setInStore('plans_quantity', parseInt(document.getElementById('plans_quantity').value))
        refresh()
    })
    document.getElementById('two_up').addEventListener('change', async () => {
        await window.electronAPI.setInStore('two_up', document.getElementById('two_up').checked)
    })
    document.getElementById('page_size').addEventListener('change', async () => {
        await window.electronAPI.setInStore('page_size', document.getElementById('page_size').value)
    })
    document.getElementById('client_secret').addEventListener('change', async () => {
        await window.electronAPI.setInStore('client_secret', document.getElementById('client_secret').value)
    })
    document.getElementById('client_id').addEventListener('change', async () => {
        await window.electronAPI.setInStore('client_id', document.getElementById('client_id').value)
    })

    await loadSettings()

    window.electronAPI.leftRendererStartupComplete()
}

load()
