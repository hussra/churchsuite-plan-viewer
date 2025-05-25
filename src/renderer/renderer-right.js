import './right.css';
import 'bootstrap'
import 'bootstrap/dist/css/bootstrap.min.css'

window.electronAPI.onSetPlan((planDetail) => {
    if (planDetail.show) {
        document.getElementById('selectPlan').classList.add('d-none')
        document.getElementById('planContents').innerHTML = planDetail.html
        window.document.title = planDetail.title
    } else {
        document.getElementById('selectPlan').classList.remove('d-none')
        document.getElementById('planContents').innerHTML = ''
    }
})
