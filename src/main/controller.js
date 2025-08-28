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

import { EventEmitter } from 'node:events'
import { safeStorage } from 'electron'
import Store from 'electron-store'
import { request } from "undici"

import { SETTINGS_SCHEMA } from './constants'
import { TemplateEngine } from './template-engine'

export class Controller extends EventEmitter {

    constructor() {
        super()

        this.#store = new Store({
            schema: SETTINGS_SCHEMA
        })
        this.#store.onDidAnyChange((newValue, oldValue) => {
            this.#configChanged()
        })

        this.#templateEngine = new TemplateEngine(this)
    }

    #store

    #authToken = null
    #isConnected = false

    #allPlans = [];                          // All available plans for selection
    #showPlanView = false;                   // Is currently selected plan available for viewing?

    #selectedPlanId = 0;                     // Currently selected plan

    #selectedPlan
    #selectedPlanHtml = '';
    #selectedPlanCss = '';

    #templateEngine
    #selectedTemplate = ''

    set selectedTemplateId(templateId) {
        this.#selectedTemplate = templateId
        this.saveSetting('template', templateId)

        this.#planIdOrTemplateIdChanged()
    }

    get selectedTemplateId() {
        return this.#selectedTemplate
    }

    set selectedPlanId(planId) {
        this.#selectedPlanId = planId

        this.#planIdOrTemplateIdChanged()
    }

    get selectedPlan() {
        return this.#selectedPlan
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

    get templateEngine() {
        return this.#templateEngine
    }

    get allTemplates() {
        return this.#templateEngine.allTemplates
    }

    get selectedPlanId() {
        return this.#selectedPlanId
    }

    get showPlanView() {
        return this.#showPlanView
    }

    get selectedPlanHtml() {
        return this.#selectedPlanHtml
    }

    get selectedPlanCss() {
        return this.#selectedPlanCss
    }

    get template() {
        return this.#templateEngine.getTemplateById(this.#selectedTemplate)
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

    #planIdOrTemplateIdChanged() {
        if ((this.#selectedTemplate == null) ||
            (this.#selectedTemplate == '') ||
            (this.#selectedPlanId == '') ||
            (this.#selectedPlanId == 0)) {

            this.#showPlanView = false
            this.#selectedPlanHtml = ''
            this.#selectedPlanCss = ''

            this.emit('viewChanged', this.#selectedPlanId)
        } else {
            this.loadPlan()
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

        this.emit('templatesChanged')
    }

    async loadPlans() {
        const planData = await this.#getPlans()

        let allPlans = []
        if (planData.data) {
            allPlans = planData.data.map((plan) => {
                return {
                    id: plan.id,
                    date: plan.date,
                    timestamp: Date.parse(plan.date + " " + plan.time)
                }
            })
        }

        // For past plans, sort in reverse date order (most recent first)
        if (this.getSetting('past_plans')) {
            this.#allPlans = allPlans.sort(({ timestamp: a }, { timestamp: b }) => b - a)
        } else {
            this.#allPlans = allPlans
        }

        this.emit('plansChanged')
    }

    async loadPlan() {
        const detail = (await this.#getPlanDetail(this.#selectedPlanId)).data

        this.#selectedPlan = {
            plan: {
                detail: {
                    ...detail,
                    date_time: new Date(Date.parse(detail.date + " " + detail.time))
                },
                items: (await this.#getPlanItems(this.#selectedPlanId)).data
            }
        }

        console.log(this.#selectedPlan)

        const template = this.getSetting('template')

        this.#selectedPlanHtml = await this.#templateEngine.renderPlan(template, this.#selectedPlan)
        this.#selectedPlanCss = this.#templateEngine.getCSSById(template)

        this.#showPlanView = true
        this.emit('viewChanged')
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

}