import './right.css';
import $ from 'jquery'
import 'bootstrap'
import 'bootstrap/dist/css/bootstrap.min.css'

window.electronAPI.onSetPlan((planDetail) => {
    if (planDetail.show) {
        $('#selectPlan').hide()
        $('#planContents').html(planDetail.html)
        window.document.title = planDetail.title
    } else {
        $('#selectPlan').show()
        $('#planContents').html('')
    }
})
