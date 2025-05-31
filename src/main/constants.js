export const WINDOW_WIDTH = 1200
export const WINDOW_HEIGHT = 800
export const LEFT_PANEL_WIDTH = 300
export const BAR_WIDTH = 2

export const SETTINGS_SCHEMA = {
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