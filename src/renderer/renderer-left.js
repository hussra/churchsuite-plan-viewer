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

    for (let i in plans) {
        let option = document.createElement('option')
        option.innerHTML = plans[i].date
        option.setAttribute('value', plans[i].id)
        planSelect.append(option)
        if (plans[i].id == selectedPlan) {
            planSelect.value = selectedPlan
        }
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
