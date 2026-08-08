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
import { createHash, randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { app, safeStorage, shell } from 'electron'
import Store from 'electron-store'
import { request } from 'undici'
import toValidIdentifier from 'to-valid-identifier'
import log from 'electron-log/main'

import { SETTINGS_SCHEMA, OLD_SETTINGS_TO_DELETE_1_3, OLD_SETTINGS_TO_DELETE_1_4, HIDDEN_ITEM_TYPE_NAME, LOGGING_AVAILABLE_WHEN_PACKAGED, API_SCOPES_REQUIRED, CHURCHSUITE_REDIRECT_URI, CHURCHSUITE_AUTH_URL, CHURCHSUITE_TOKEN_URL } from './constants'
import { LayoutEngine } from './layout-engine'
import { ChartEngine } from './chart-engine'

const REDIRECT_SUCCESS_HTML = readFileSync(new URL('./redirect-success.html', import.meta.url), 'utf8')
const REDIRECT_FAILURE_HTML = readFileSync(new URL('./redirect-failure.html', import.meta.url), 'utf8')

export class Controller extends EventEmitter {

    constructor() {
        super()

        this.#store = new Store({
            schema: SETTINGS_SCHEMA,
            beforeEachMigration: (store, context) => {
		        log.info(`[store migrations] migrate from ${context.fromVersion} to ${context.toVersion}`)
	        },
            migrations: {
                '1.3.0': (store) => {
                    log.info('[store migrations] running migration for version 1.3.0: migrating custom template storage to new format')
                    const customTemplates = store.get('custom_templates')

                    if (customTemplates && Array.isArray(customTemplates)) {
                        customTemplates.forEach(template => {
                            const id = template.id
                            delete template.id
                            store.set(`templates.${id}`, template)
                        })
                    }

                    OLD_SETTINGS_TO_DELETE_1_3.forEach(key => store.delete(key))
                    log.info('[store migrations] migration for version 1.3.0 complete')
                },
                '1.4.0': (store) => {
                    log.info('[store migrations] running migration for version 1.4.0: migrating templates to layouts')
                    if (store.has('template')) {
                        store.set('layout', store.get('template'))
                    }
                    if (store.has('templates')) {
                        store.set('layouts', store.get('templates'))
                    }
                    store.set('templates', {})
                    OLD_SETTINGS_TO_DELETE_1_4.forEach(key => store.delete(key))
                    log.info('[store migrations] migration for version 1.4.0 complete')
                }
            }
        })
        this.#store.onDidChange('enable_logging', ( newValue, _oldValue) => {
            log.transports.file.level = (newValue ? 'debug' : 'error')
        })
        this.#store.onDidAnyChange(( _newValue, _oldValue) => {
            this.#configChanged()
        })

        this.#authToken = this.getGlobalSetting('access_token') || null
        this.#userName = this.getGlobalSetting('user_name') || ''
        this.#isConnected = !!this.#authToken
        this.deleteGlobalSetting('client_secret')
        this.deleteGlobalSetting('client_id')

        log.transports.file.level = (this.getGlobalSetting('enable_logging') ? 'debug' : 'error')

        this.#layoutEngine = new LayoutEngine(this)
        this.#chartEngine = new ChartEngine()
    }

    #store

    #authToken = null
    #isConnected = false
    #userName = ''
    #oauthState = null
    #pkceCodeVerifier = null
    #redirectServer = null

    #defaultBrand = null
    #types = null
    #cache = {}

    #allPlans = []                          // All available plans for selection
    #showPlanView = false                   // Is currently selected plan available for viewing?

    #selectedPlanId = 0                     // Currently selected plan

    #selectedPlan
    #selectedPlanHtml = ''
    #selectedPlanTitle = ''
    #selectedPlanCss = ''

    #layoutEngine
    #selectedLayout = ''

    #chartEngine

    set selectedLayoutId(layoutId) {
        this.#selectedLayout = layoutId
        this.setGlobalSetting('layout', layoutId)
        this.emit('layoutChanged', layoutId)
        this.#planIdOrLayoutIdChanged()
    }

    get selectedLayoutId() {
        return this.#selectedLayout
    }

    set selectedPlanId(planId) {
        this.#selectedPlanId = planId
        this.emit('planChanged', planId)
        this.#planIdOrLayoutIdChanged()
    }

    get selectedPlan() {
        return this.#selectedPlan
    }

    get connected() {
        return this.#isConnected
    }

    get authenticatedUserName() {
        return this.#userName
    }

    set connected(isConnected) {
        const changed = (isConnected != this.#isConnected)
        this.#isConnected = isConnected

        if (changed || !isConnected) {
            this.emit('configChanged', isConnected)
            if (isConnected) {
                this.reload()
            }
        }
    }

    get allPlans() {
        return this.#allPlans
    }

    get layoutEngine() {
        return this.#layoutEngine
    }

    get allLayouts() {
        return this.#layoutEngine.allLayouts
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

    get selectedPlanTitle() {
        return this.#selectedPlanTitle
    }

    get selectedPlanCss() {
        return this.#selectedPlanCss
    }

    get layout() {
        return this.#layoutEngine.getLayoutById(this.#selectedLayout)
    }

    get loggingAvailable() {
        return LOGGING_AVAILABLE_WHEN_PACKAGED || !app.isPackaged
    }

    getGlobalSetting(key) {
        if ((key == 'access_token') || (key == 'refresh_token')) {
            const value = this.#store.get(key)
            if (!value) {
                return ''
            }
            if (value.startsWith('base64:')) {
                return safeStorage.decryptString(Buffer.from(value.substring(7), 'base64'))
            }
            this.#store.set(key, 'base64:' + safeStorage.encryptString(value).toString('base64'))
            return value
        }

        return this.#store.get(key)
    }

    setGlobalSetting(key, value) {
        if ((key == 'access_token') || (key == 'refresh_token')) {
            const storedValue = (value == null || value == '') ? '' : 'base64:' + safeStorage.encryptString(value).toString('base64')
            this.#store.set(key, storedValue)
        } else {
            this.#store.set(key, value)
        }
    }

    deleteGlobalSetting(key) {
        this.#store.delete(key)
    }

    getLayoutSetting(key) {
        return this.getGlobalSetting(`layouts.${this.#selectedLayout}.${key}`)
    }

    setLayoutSetting(key, value) {
        this.setGlobalSetting(`layouts.${this.#selectedLayout}.${key}`, value)
    }

    #planIdOrLayoutIdChanged() {
        if ((this.#selectedLayout == null) ||
            (this.#selectedLayout == '') ||
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

    getClientId() {
        return (this.getGlobalSetting('churchsuite_client_id') || '').trim()
    }

    async #startRedirectServer() {
        if (this.#redirectServer) {
            return
        }

        const redirectUrl = new URL(CHURCHSUITE_REDIRECT_URI)

        await new Promise((resolve, reject) => {
            this.#redirectServer = createServer(async (req, res) => {
                try {
                    const requestUrl = new URL(req.url || '/', `http://${req.headers.host || redirectUrl.host}`)
                    const isCallback = requestUrl.origin === redirectUrl.origin && requestUrl.pathname === redirectUrl.pathname
                    if (!isCallback) {
                        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
                        res.end('Not found')
                        return
                    }

                    const result = await this.handleAuthorizationResponse(requestUrl.toString())
                    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
                    res.end(result ? REDIRECT_SUCCESS_HTML : REDIRECT_FAILURE_HTML)
                    this.#stopRedirectServer()
                } catch (error) {
                    log.error(`[auth] Failed to handle redirect request: ${error.message}`)
                    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
                    res.end('Authentication callback failed')
                    this.#stopRedirectServer()
                }
            })

            this.#redirectServer.on('error', (error) => {
                log.error(`[auth] Redirect server failed to start: ${error.message}`)
                this.#redirectServer = null
                reject(error)
            })

            this.#redirectServer.listen(redirectUrl.port, redirectUrl.hostname, () => {
                this.#redirectServer.unref()
                resolve()
            })
        })
    }

    #stopRedirectServer() {
        if (!this.#redirectServer) {
            return
        }

        this.#redirectServer.close(() => {
            this.#redirectServer = null
        })
        this.#redirectServer = null
    }

    async initiateLogin() {
        const clientId = this.getClientId()
        if (!clientId) {
            log.error('[auth] OAuth client ID is not configured')
            return false
        }

        const verifier = randomBytes(32).toString('base64url')
        this.#pkceCodeVerifier = verifier
        this.#oauthState = randomBytes(16).toString('base64url')

        const challenge = createHash('sha256').update(verifier).digest('base64url')
        const url = new URL(CHURCHSUITE_AUTH_URL)
        url.searchParams.set('client_id', clientId)
        url.searchParams.set('redirect_uri', CHURCHSUITE_REDIRECT_URI)
        url.searchParams.set('response_type', 'code')
        url.searchParams.set('scope', API_SCOPES_REQUIRED)
        url.searchParams.set('state', this.#oauthState)
        url.searchParams.set('code_challenge', challenge)
        url.searchParams.set('code_challenge_method', 'S256')

        await this.#startRedirectServer()
        await shell.openExternal(url.toString())
        return true
    }

    async handleAuthorizationResponse(rawUrl) {
        try {
            const clientId = this.getClientId()
            if (!clientId) {
                log.error('[auth] OAuth client ID is not configured')
                this.logout()
                return false
            }

            const url = new URL(rawUrl)
            const redirectUrl = new URL(CHURCHSUITE_REDIRECT_URI)
            if (url.protocol !== 'http:' || url.origin !== redirectUrl.origin || url.pathname !== redirectUrl.pathname) {
                return false
            }

            const code = url.searchParams.get('code')
            const state = url.searchParams.get('state')
            if (!code || !state || state !== this.#oauthState) {
                log.error('[auth] OAuth callback rejected: missing or invalid state/code')
                this.logout()
                return false
            }

            this.#oauthState = null
            const tokenBody = new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: clientId,
                code,
                redirect_uri: CHURCHSUITE_REDIRECT_URI,
                code_verifier: this.#pkceCodeVerifier || ''
            })

            const { statusCode, body } = await request(CHURCHSUITE_TOKEN_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: tokenBody.toString()
            })

            if (statusCode !== 200) {
                const errorText = await body.text()
                log.error(`[auth] OAuth token exchange failed (${statusCode}): ${errorText}`)
                this.logout()
                return false
            }

            const tokenResponse = await body.json()
            this.#authToken = tokenResponse.access_token || null
            this.#pkceCodeVerifier = null

            if (!this.#authToken) {
                this.logout()
                return false
            }

            this.setGlobalSetting('access_token', this.#authToken)
            if (tokenResponse.refresh_token) {
                this.setGlobalSetting('refresh_token', tokenResponse.refresh_token)
            }

            const user = await this.#getCurrentUser()
            this.#userName = user?.data?.name || ''
            if (this.#userName) {
                this.setGlobalSetting('user_name', this.#userName)
            }

            this.connected = true
            this.emit('authChanged')
            return true
        } catch (error) {
            log.error(`[auth] Failed to process OAuth redirect: ${error.message}`)
            this.logout()
            return false
        }
    }

    async #refreshAccessToken() {
        const clientId = this.getClientId()
        const refreshToken = this.getGlobalSetting('refresh_token')

        if (!clientId || !refreshToken) {
            log.warn('[auth] Refresh token exchange skipped: missing client ID or refresh token')
            return null
        }

        try {
            const tokenBody = new URLSearchParams({
                grant_type: 'refresh_token',
                client_id: clientId,
                refresh_token: refreshToken
            })

            const { statusCode, body } = await request(CHURCHSUITE_TOKEN_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: tokenBody.toString()
            })

            if (statusCode !== 200) {
                const errorText = await body.text()
                log.error(`[auth] OAuth refresh token exchange failed (${statusCode}): ${errorText}`)
                return null
            }

            const tokenResponse = await body.json()
            const refreshedAccessToken = tokenResponse.access_token || null
            if (!refreshedAccessToken) {
                log.error('[auth] OAuth refresh token exchange returned no access token')
                return null
            }

            this.#authToken = refreshedAccessToken
            this.setGlobalSetting('access_token', this.#authToken)

            if (tokenResponse.refresh_token) {
                this.setGlobalSetting('refresh_token', tokenResponse.refresh_token)
            }

            this.connected = true
            this.emit('authChanged')
            return this.#authToken
        } catch (error) {
            log.error(`[auth] Failed to refresh OAuth access token: ${error.message}`)
            return null
        }
    }

    logout() {
        this.#stopRedirectServer()
        this.#authToken = null
        this.#pkceCodeVerifier = null
        this.#oauthState = null
        this.#userName = ''
        this.setGlobalSetting('access_token', '')
        this.setGlobalSetting('refresh_token', '')
        this.setGlobalSetting('user_name', '')
        this.connected = false
        this.#showPlanView = false
        this.emit('authChanged')
        this.emit('viewChanged')
    }

    async reload() {
        await this.#getAccountInfo()
        await this.#getDefaultBrand(true)
        await this.#getTypes(true)
        await this.loadPlans()
        this.#cache = {}

        this.emit('layoutsChanged')
    }

    async loadPlans() {

        if (this.getGlobalSetting('show_templates')) {
            const templateData = await this.#getPlanTemplates()
            let allPlanTemplates = []
            if (templateData.data) {
                allPlanTemplates = await Promise.all(templateData.data.map(async (planTemplate) => {
                    return {
                        id: planTemplate.id,
                        name: planTemplate.name
                    }
                }))
            }
            this.#allPlans = allPlanTemplates

        } else {
            // Load plans, rather than plan templates
            const planData = await this.#getPlans()

            let allPlans = []
            if (planData.data) {
                allPlans = await Promise.all(planData.data.map(async (plan) => {
                    const timestamp = Date.parse(plan.date + " " + plan.time)
                    return {
                        id: plan.id,
                        date: plan.date,
                        timestamp: timestamp,
                        name: await this.#layoutEngine.renderPlanTitleShort(new Date(timestamp), plan.name)
                    }
                }))
            }

            // For past plans, sort in reverse date order (most recent first)
            if (this.getGlobalSetting('past_plans')) {
                this.#allPlans = allPlans.sort(({ timestamp: a }, { timestamp: b }) => b - a)
            } else {
                this.#allPlans = allPlans.sort(({ timestamp: a }, { timestamp: b }) => a - b)
            }
        }

        this.emit('plansChanged')
    }

    async loadPlan() {
        // Get plan detail, items, brand, types from ChurchSuite API
        const detail = (await this.#getPlanDetail(this.#selectedPlanId)).data
        // Plan items are now returned in ID order, so sort them by the "order" property
        const items = (await this.#getPlanItems(this.#selectedPlanId)).data.sort(({ order: a }, { order: b }) => a - b)
        const account = (await this.#getAccountInfo()).data
        const brand = (await this.#getDefaultBrand()).data
        const types = (await this.#getTypes())

        const showTemplates = this.getGlobalSetting('show_templates')
        if (showTemplates) {
            detail.date = '1970-01-01'
        }

        // Calculate plan start time
        const startTimestamp = Date.parse(detail.date + " " + detail.time)
        let currentTimestamp = startTimestamp

        if (this.#isIterable(items)) {
            for (let item of items) {
                // Assign times to each item
                // Time now is either when the previous item ended, or the item's own start time
                if (item.time_start) {
                    currentTimestamp = Date.parse(detail.date + " " + item.time_start)
                }
                item.date_time = new Date(currentTimestamp)

                if (item.duration) {
                    currentTimestamp += item.duration * 1000
                }

                // Handle songs
                if ((this.getLayoutSetting('song_lyrics')) && (item.type == 'song') && (item.arrangement_id != null)) {
                    let arrangement = (await this.#getSongArrangement(item.arrangement_id)).data
                    if (arrangement?.song_id) {
                        let song = (await this.#getSong(arrangement.song_id)).data

                        item.arrangement = arrangement
                        item.song = song

                        item.arrangement.stanzas = this.#chartEngine.chartToStanzas(arrangement.chart || '')
                    }
                }
            }
        }

        // Strip out items of type 'hidden'
        const hiddenType = Object.values(types).find(type => type.name.toLowerCase() == HIDDEN_ITEM_TYPE_NAME)
        let filteredItems = items
        if (hiddenType?.id) {
            filteredItems = items.filter(item => item.type_id != hiddenType.id)
        }

        // Build object to send to layout engine
        this.#selectedPlan = {
            plan: {
                detail: {
                    ...detail,
                    date_time: new Date(startTimestamp)
                },
                items: filteredItems,
            },
            account: account,
            brand: brand,
            types: types,
            settings: {
                timings: this.getLayoutSetting('timings'),
                time_format: this.getLayoutSetting('time_format'),
                song_lyrics: this.getLayoutSetting('song_lyrics'),
            }
        }

        // Render plan with selected layout
        const layout = this.getGlobalSetting('layout')
        try {
            this.#selectedPlanHtml = await this.#layoutEngine.renderPlanHTML(layout, this.#selectedPlan)
            this.#selectedPlanTitle = await this.#layoutEngine.renderPlanTitle(this.#selectedPlan)
            this.#selectedPlanCss = this.#layoutEngine.renderPlanCSS(layout, this.#selectedPlan)
        } catch (e) {
            this.#selectedPlanHtml = `<h1>Error</h1><div style="error">Error rendering plan with selected layout:<br />${e.message}</div>`
            this.#selectedPlanTitle = 'Error'
            this.#selectedPlanCss = ''
        }

        // Send to views
        this.#showPlanView = true
        this.emit('viewChanged')
        this.emit('selectedPlanChanged')
    }


    // Get a ChurchSuite authentication token
    async #getAuthToken(force = false) {
        if (this.#authToken && !force) {
            return this.#authToken
        }

        const storedToken = this.getGlobalSetting('access_token')
        if (storedToken) {
            this.#authToken = storedToken
            return this.#authToken
        }

        this.#authToken = null
        return null
    }


    // Make an API call to ChurchSuite and return the body as a JSON object
    async #makeApiCall(url) {
        if (this.#cache[url]) {
            return this.#cache[url]
        }

        let authToken = await this.#getAuthToken()

        if (authToken == null) {
            this.connected = false
            delete this.#cache[url]
            return {}
        }

        let { statusCode, body } = await request(url, {
            headers: {
                'Authorization': 'Bearer ' + authToken
            }
        })

        if (statusCode === 401 || statusCode === 403) {
            log.warn(`[#makeApiCall] API call to ${url} was rejected with HTTP status code ${statusCode}; attempting token refresh`)

            const refreshedAccessToken = await this.#refreshAccessToken()
            if (!refreshedAccessToken) {
                this.logout()
                delete this.#cache[url]
                return {}
            }

            authToken = refreshedAccessToken
            const { statusCode: retryStatusCode, body: retryBody } = await request(url, {
                headers: {
                    'Authorization': 'Bearer ' + authToken
                }
            })

            if (retryStatusCode != 200) {
                log.error(`[#makeApiCall] On retrying after refresh, received HTTP status code: ${retryStatusCode}\n${await retryBody.text()}`)
                if (retryStatusCode === 401 || retryStatusCode === 403) {
                    this.logout()
                } else {
                    this.connected = false
                }
                delete this.#cache[url]
                return {}
            }

            statusCode = retryStatusCode
            body = retryBody
        }

        if (statusCode != 200) {
            log.error(`[#makeApiCall] HTTP error retrieving ${url}: received HTTP status code ${statusCode}\n${await body.text()}`)

            this.connected = false
            delete this.#cache[url]
            return {}
        }

        this.connected = true
        const jsonResponse = await body.json()
        this.#cache[url] = jsonResponse
        if (this.getGlobalSetting('enable_logging')) {
            log.debug(`[#makeApiCall] API call to ${url} returned:\n${JSON.stringify(jsonResponse, null, 2)}`)
        }
        return jsonResponse
    }


    // Get future plans
    async #getPlans() {
        let now = new Date()
        const offset = now.getTimezoneOffset()
        let todayDate = new Date(now.getTime() - (offset * 60 * 1000))
        let yesterdayDate = new Date(now.getTime() - (offset * 60 * 1000) - 86400000)
        const today = todayDate.toISOString().split('T')[0]
        const yesterday = yesterdayDate.toISOString().split('T')[0]

        let url = 'https://api.churchsuite.com/v2/planning/plans'

        if (this.getGlobalSetting('past_plans')) {
            url = url + `?starts_before=${today}`
        } else {
            url = url + `?starts_after=${yesterday}`
        }

        const limit = this.getGlobalSetting('plans_quantity')
        url = url + `&per_page=${limit}`

        let plans = await this.#makeApiCall(url)

        if (this.getGlobalSetting('draft_plans')) {
            url = url + '&status=draft'
            let draftPlans = await this.#makeApiCall(url)

            if (Object.prototype.hasOwnProperty.call(draftPlans, 'data') && Array.isArray(draftPlans.data)) {
                if (!Object.prototype.hasOwnProperty.call(plans, 'data') || !Array.isArray(plans.data)) {
                    plans.data = []
                }
                draftPlans.data.forEach((element) => {
                    element.name = element.name + ' (Draft)'
                })
                plans.data = plans.data.concat(draftPlans.data).slice(0, limit)
            }
        }

        return plans
    }


    // Get plan templates
    async #getPlanTemplates() {

        let url = 'https://api.churchsuite.com/v2/planning/templates'

        const limit = this.getGlobalSetting('plans_quantity')
        url = url + `?per_page=${limit}`

        return await this.#makeApiCall(url)
    }


    // Get the detail of a plan or plan template, by ID
    async #getPlanDetail(planId) {
        if (this.getGlobalSetting('show_templates')) {
            return this.#makeApiCall(`https://api.churchsuite.com/v2/planning/templates/${planId}`)
        } else {
            return this.#makeApiCall(`https://api.churchsuite.com/v2/planning/plans/${planId}`)
        }
    }


    // Get the items for a plan or plan template, by ID
    async #getPlanItems(planId) {
        if (this.getGlobalSetting('show_templates')) {
            return this.#makeApiCall(`https://api.churchsuite.com/v2/planning/template_items?template_ids%5B%5D=${planId}`)
        } else {
            return this.#makeApiCall(`https://api.churchsuite.com/v2/planning/plan_items?plan_ids%5B%5D=${planId}`)
        }
    }


    // Get a song, by ID
    async #getSong(songId) {
        return this.#makeApiCall(`https://api.churchsuite.com/v2/planning/songs/${songId}`)
    }


    // Get a song arrangement, by ID
    async #getSongArrangement(arrangementId) {
        return this.#makeApiCall(`https://api.churchsuite.com/v2/planning/song_arrangements/${arrangementId}`)
    }


    // Get the item types, as an array keyed by name
    async #getTypes(force = false) {
        if ((this.#types == null) || force) {
            const typesFromAPI = (await this.#makeApiCall('https://api.churchsuite.com/v2/planning/types'))

            let types = {}
            
            if (Object.prototype.hasOwnProperty.call(typesFromAPI, 'data') && Array.isArray(typesFromAPI.data)) {
                for (let type of typesFromAPI.data) {
                    const name = toValidIdentifier(type.name.toLowerCase().replace(/\s+/g, '_'))
                    types[name] = type
                }
            }

            this.#types = types
        }

        return this.#types
    }


    async #getAccountInfo() {
        return this.#makeApiCall('https://api.churchsuite.com/v2/account/info')
    }


    async #getCurrentUser() {
        return this.#makeApiCall('https://api.churchsuite.com/v2/account/users/current')
    }


    // Get the default brand for our account, and add a data.logo.data_url property
    async #getDefaultBrand(force = false) {
        if ((this.#defaultBrand == null) || force) {
            this.#defaultBrand = await this.#makeApiCall('https://api.churchsuite.com/v2/account/brands/default')   
        }

        if (this.#defaultBrand && this.#defaultBrand.data && this.#defaultBrand.data.logo && this.#defaultBrand.data.logo.url) {
            // Convert logo URL to data URL
            this.#defaultBrand.data.logo.data_url = await this.#getImageAsDataUrl(this.#defaultBrand.data.logo.url)
        }

        return this.#defaultBrand
    }

    async #getImageAsDataUrl(url) {
        let { statusCode, headers, body } = await request(url)

        if (statusCode != 200) {
            return ""
        }

        let bytes = await body.bytes()

        return 'data:' + headers['content-type'] + ';base64,' + bytes.toBase64()
    }

    async suggestFilename() {
        return (await this.#layoutEngine.renderPlanDateTimeShort(
                    this.#selectedPlan.plan.detail.date_time,
                    this.#selectedPlan.plan.detail.name
                ))
            .replace(/\s/g, '-')
            .replace(/:/g, '') +
            this.getLayoutSetting('filenameSuffix') +
            (this.getLayoutSetting('two_up') ? '-2up' : '') + '.pdf'
    }

    /**
     * Determine whether the given `input` is iterable.
     *
     * @returns boolean
     */
    #isIterable(input) {  
        if (input === null || input === undefined) {
            return false
        }

        return typeof input[Symbol.iterator] === 'function'
    }

    appStartupComplete() {
        // Force reconnection
        this.#isConnected = false
        this.#configChanged()
    }

}