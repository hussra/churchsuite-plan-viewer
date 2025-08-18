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

import { app, dialog, shell, safeStorage } from 'electron'
import { EventEmitter } from 'node:events'
import * as path from 'node:path'
import * as fs from 'fs'
import Store from 'electron-store'
import { Liquid } from 'liquidjs'
import coherentpdf from 'coherentpdf'
import { request } from "undici"
import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';

import { win, rightView } from './window'
import { SETTINGS_SCHEMA, BOOK_MAPPING } from './constants'

export class Controller extends EventEmitter {

    constructor() {
        super()

        this.#store = new Store({
            schema: SETTINGS_SCHEMA
        })
        this.#store.onDidAnyChange((newValue, oldValue) => {
            this.#configChanged()
        })
        this.#liquidEngine = new Liquid({
            root: path.resolve(__dirname, 'views/'),
            extname: '.liquid'
        })
        this.#liquidEngine.registerFilter('bibleBook', this.bibleBookName)
    }

    #store
    #liquidEngine

    #authToken = null
    #isConnected = false

    #allPlans = [];                          // All available plans for selection
    #showPlanView = false;                   // Is currently selected plan available for viewing?

    #selectedPlanId = 0;                     // Currently selected plan
    #selectedPlanTitle = 'No plan selected';
    #selectedPlanDetail = null;
    #selectedPlanItems = [];
    #selectedPlanHtml = '';

    set selectedPlanId(planId) {
        this.#selectedPlanId = planId

        if ((planId == '') || (planId == 0)) {
            this.#selectedPlanId = 0
            this.#showPlanView = false
            this.#selectedPlanTitle = 'No plan selected'
            this.#selectedPlanDetail = null
            this.#selectedPlanItems = []
            this.#selectedPlanHtml = ''

            this.emit('viewChanged', this.#selectedPlanId)
        } else {
            this.#selectedPlanId = planId
            this.loadPlan()
        }
    }

    get connected() {
        return this.#isConnected
    }

    set connected(isConnected) {
        const changed = (isConnected != this.#isConnected)
        this.#isConnected = isConnected

        if (changed || !isConnected) {
            this.emit('configChanged', this.isConfigured() && isConnected)
            if (isConnected) {
                this.reload()
            }
        }
    }

    get allPlans() {
        return this.#allPlans
    }

    get selectedPlanId() {
        return this.#selectedPlanId
    }

    get selectedPlanDetail() {
        return this.#selectedPlanDetail
    }

    get showPlanView() {
        return this.#showPlanView
    }

    get selectedPlanTitle() {
        return this.#selectedPlanTitle
    }

    get selectedPlanHtml() {
        return this.#selectedPlanHtml
    }

    getSetting(key) {
        if ((key == 'client_secret') || (key == 'client_id')) {
            const value = this.#store.get(key)
            if (value.startsWith('base64:')) {
                return safeStorage.decryptString(Buffer.from(value.substring(7), 'base64'))
            } else {
                // Encrypt value and store that
                this.#store.set(key, 'base64:' + safeStorage.encryptString(value).toString('base64'))
                return value
            }
        } else {
            return this.#store.get(key)
        }
    }

    saveSetting(key, value) {
        if ((key == 'client_secret') || (key == 'client_id')) {
            this.#store.set(key, 'base64:' + safeStorage.encryptString(value).toString('base64'))
        } else {
            this.#store.set(key, value)            
        }
    }

    async #configChanged() {
        // Force reauthentication
        await this.#getAuthToken(true)
        this.connected = (this.#authToken != null)
    }

    isConfigured() {
        return (this.#store.get('client_id') != '') && (this.#store.get('client_secret') != '')
    }

    async reload() {
        this.loadPlans()
    }

    async loadPlans() {
        const planData = await this.#getPlans()

        if (planData.data) {
            this.#allPlans = planData.data.map((plan) => {
                return {
                    id: plan.id,
                    date: plan.date
                }
            })
        } else {
            this.#allPlans = []
        }

        this.emit('plansChanged', this.#allPlans)
    }

    async loadPlan() {
        this.#selectedPlanDetail = (await this.#getPlanDetail(this.#selectedPlanId)).data
        this.#selectedPlanItems = (await this.#getPlanItems(this.#selectedPlanId)).data

        this.#selectedPlanTitle = this.#selectedPlanDetail.date + " " + this.#selectedPlanDetail.time + " - " + this.#selectedPlanDetail.name

        const rawHtml = await this.#liquidEngine.renderFile('default', {
            plan: {
                detail: this.#selectedPlanDetail,
                items: this.#selectedPlanItems
            }
        })

        const window = new JSDOM('').window;
        const purify = DOMPurify(window);
        this.#selectedPlanHtml = purify.sanitize(rawHtml);

        this.#showPlanView = true

        this.emit('viewChanged')
    }


    async exportPDF() {
        // TODO: Don't like this bit being here rather than in window.js
        dialog.showSaveDialog(win, {
            defaultPath: path.join(app.getPath('downloads'), this.#selectedPlanDetail.date + '.pdf')
        }).then((result) => {
            if (result.cancelled) return

            let pdf
            let mergedPdf

            // TODO: Don't like this bit being here rather than in window.js
            rightView.webContents.printToPDF({
                printBackground: true,
                pageSize: this.#store.get('page_size')
            }).then(data => {

                let twoUp = this.#store.get('two_up')

                if (twoUp) {
                    pdf = coherentpdf.fromMemory(data, '')
                    mergedPdf = coherentpdf.mergeSimple([pdf, pdf])
                    coherentpdf.twoUp(mergedPdf)
                    coherentpdf.rotate(mergedPdf, coherentpdf.all(mergedPdf), 90)
                    coherentpdf.toFile(twoUp ? mergedPdf : pdf, result.filePath, false, false)
                } else {
                    fs.writeFileSync(result.filePath, data)
                }

                shell.openPath(result.filePath)
            }).catch((err) => {
                // TODO: Don't like this bit being here rather than in window.js
                dialog.showMessageBox(win, {
                    type: 'error',
                    title: 'Unable to save file',
                    message: `Sorry, we were not able to save this plan to ${result.filePath} - is the file already open?`
                })
            }).finally(() => {
                coherentpdf.deletePdf(mergedPdf)
                coherentpdf.deletePdf(pdf)
            })

        })

    }


    // Get a ChurchSuite authentication token
    async #getAuthToken(force = false) {

        if (this.#authToken && !force) return this.#authToken

        const { statusCode, body } = await request(
            'https://login.churchsuite.com',
            {
                path: '/oauth2/token',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Basic ' + Buffer.from(this.getSetting('client_id') + ":" + this.getSetting('client_secret')).toString('base64'),
                },
                body: '{"grant_type": "client_credentials", "scope": "full_access"}',
            });

        if (statusCode == 200) {
            this.#authToken = (await body.json()).access_token
        } else {
            this.#authToken = null
        }

        return this.#authToken
    }


    // Make an API call to ChurchSuite and return the body as a JSON object
    async #makeApiCall(url) {
        let authToken = await this.#getAuthToken()

        if (authToken == null) {
            // throw new Error('Unable to authenticate')
            this.connected = false
            return {}
        }

        let { statusCode, body } = await request(url, {
            headers: {
                'Authorization': 'Bearer ' + authToken
            }
        })

        if (statusCode != 200) {
            // Retry once
            authToken = await this.#getAuthToken(true)

            let { statusCode, body } = await request(url, {
                headers: {
                    'Authorization': 'Bearer ' + authToken
                }
            })

            if (statusCode != 200) {
                //throw new Error('Unable to authenticate')
                this.connected = false
                return {}
            }
        }

        this.connected = true
        return body.json()
    }


    // Get future plans
    async #getPlans() {
        let now = new Date()
        const offset = now.getTimezoneOffset();
        let todayDate = new Date(now.getTime() - (offset * 60 * 1000));
        let yesterdayDate = new Date(now.getTime() - (offset * 60 * 1000) - 86400000);
        const today = todayDate.toISOString().split('T')[0]
        const yesterday = yesterdayDate.toISOString().split('T')[0]

        let url = 'https://api.churchsuite.com/v2/planning/plans'

        if (this.getSetting('past_plans')) {
            url = url + `?starts_before=${today}`
        } else {
            url = url + `?starts_after=${yesterday}`
        }

        const limit = this.getSetting('plans_quantity')
        url = url + `&per_page=${limit}`

        if (this.getSetting('draft_plans')) {
            url = url + '&status=draft'
        }

        return this.#makeApiCall(url)
    }


    // Get the detail of a plan, by ID
    async #getPlanDetail(planId) {
        return this.#makeApiCall(`https://api.churchsuite.com/v2/planning/plans/${planId}`)
    }


    // Get the items for a plan, by ID
    async #getPlanItems(planId) {
        return this.#makeApiCall(`https://api.churchsuite.com/v2/planning/plan_items?plan_ids%5B%5D=${planId}`)
    }

    appStartupComplete() {
        // this.#configChanged()
        this.emit('configChanged', this.isConfigured() && this.#isConnected)
        this.reload()
    }

    bibleBookName(abbr) {
        let name = BOOK_MAPPING[abbr]
        if (name === undefined) {
            return abbr
        }
        return name
    }

}