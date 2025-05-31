import { EventEmitter } from 'node:events'
import { request } from "undici"
import { controller } from "./main"

let authToken

async function getAuthToken() {

    if (authToken) return authToken // TODO: What happens if token has expired?

    const { statusCode, body } = await request(
        'https://login.churchsuite.com',
        {
            path: '/oauth2/token',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Basic ' + Buffer.from(controller.getSetting('client_id') + ":" + controller.getSetting('client_secret')).toString('base64'),
            },
            body: '{"grant_type": "client_credentials", "scope": "full_access"}',
        });

    if (statusCode == 200) {
        return (await body.json()).access_token
    } else {
        return null
    }
}


async function makeApiCall(url) {
    const { statusCode, body } = await request(url, {
        headers: {
            'Authorization': 'Bearer ' + await getAuthToken()
        }
    })

    return body.json()
}


// Get all plans for today and in the future
export async function getPlans() {
    let yourDate = new Date()
    const offset = yourDate.getTimezoneOffset();
    yourDate = new Date(yourDate.getTime() - (offset * 60 * 1000) - 86400000);
    const yesterday = yourDate.toISOString().split('T')[0]

    return makeApiCall(`https://api.churchsuite.com/v2/planning/plans?starts_after=${yesterday}`)
}


// Get the detail of a plan, by ID
export async function getPlanDetail(planId) {
    return makeApiCall(`https://api.churchsuite.com/v2/planning/plans/${planId}`)
}


// Get the items for a plan, by ID
export async function getPlanItems(planId) {
    return makeApiCall(`https://api.churchsuite.com/v2/planning/plan_items?plan_ids%5B%5D=${planId}`)
}