import { request } from "undici"
import { controller } from "./main"

let token

async function getToken() {

    if (token) return token // TODO: What happens if token has expired?

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


async function getAuthHeaders() {
    return {
        'Authorization': 'Bearer ' + await getToken()
    }
}


// Get all plans for today and in the future
export async function getPlans() {
    const headers = await getAuthHeaders()

    let yourDate = new Date()
    const offset = yourDate.getTimezoneOffset();
    yourDate = new Date(yourDate.getTime() - (offset * 60 * 1000) - 86400000);
    let yesterday = yourDate.toISOString().split('T')[0]

    const { statusCode, body } = await request(`https://api.churchsuite.com/v2/planning/plans?starts_after=${yesterday}`, {
        headers: headers
    })

    return body.json()
}


// Get the detail of a plan, by ID
export async function getPlanDetail(planId) {
    const headers = await getAuthHeaders()

    const { statusCode, body } = await request(`https://api.churchsuite.com/v2/planning/plans/${planId}`, {
        headers: headers
    })

    return body.json()
}


// Get the items for a plan, by ID
export async function getPlanItems(planId) {
    const headers = await getAuthHeaders()

    const { statusCode, body } = await request(`https://api.churchsuite.com/v2/planning/plan_items?plan_ids%5B%5D=${planId}`, {
        headers: headers
    })

    return body.json()
}