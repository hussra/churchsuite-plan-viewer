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

const changePlan = (event) => {
    const planId = document.getElementById('plan').value
    window.electronAPI.changePlan(planId)
}

const load = async () => {
    document.getElementById('plan').addEventListener('change', changePlan)
    await populatePlans()
}

load()
