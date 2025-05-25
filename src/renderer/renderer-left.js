import './left.css';
import $ from 'jquery'
import 'bootstrap'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.min.css'

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

const exportPDF = () => {
    window.electronAPI.exportPDF()
}

const changePlan = (event) => {
    const planId = document.getElementById('plan').value
    window.electronAPI.changePlan(planId)
}

const loadSettings = async () => {
    const client_secret = await window.electronAPI.getFromStore('client_secret')
    document.getElementById('client_secret').value = client_secret

    const client_id = await window.electronAPI.getFromStore('client_id')
    document.getElementById('client_id').value = client_id
}

const load = async () => {
    document.getElementById('plan').addEventListener('change', changePlan)
    document.getElementById('exportPDF').addEventListener('click', exportPDF)
    await loadSettings()
    await populatePlans()
}

load()
