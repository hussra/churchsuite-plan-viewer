import './right.css';
import $ from 'jquery'
import 'bootstrap'
import 'bootstrap/dist/css/bootstrap.min.css'

window.electronAPI.onSetPlan((planDetail) => {
    if (planDetail != '') {
        $('#selectPlan').hide()
        $('#planContents').html(planDetail)
    } else {
        $('#selectPlan').show()
        $('#planContents').html('')
    }
})
