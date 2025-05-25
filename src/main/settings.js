import Store from "electron-store"

const schema = {
    client_secret: {
        type: 'string'
    },
    client_id: {
        type: 'string'
    },
    page_size: {
        type: 'string',
        enum: ['a4', 'letter'],
        default: 'a4'
    },
    two_up: {
        type: 'boolean',
        default: true
    }
}

export const store = new Store({ schema })

export function isConfigured() {
    return (store.get('client_id') != '') && (store.get('client_secret') != '')
}