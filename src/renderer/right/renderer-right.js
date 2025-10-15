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

import './right.css'
import 'bootstrap'
import 'bootstrap/dist/css/bootstrap.min.css'

window.electronAPI.onSetPlan((planDetail) => {
    if (planDetail.show) {
        document.getElementById('selectPlan').classList.add('d-none')
        document.getElementById('planContents').innerHTML = planDetail.html
        document.title = planDetail.title
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: "smooth"
        })
    } else {
        document.getElementById('selectPlan').classList.remove('d-none')
        document.getElementById('planContents').innerHTML = ''
        document.title = ''
    }
})
