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

export const WINDOW_WIDTH = 1200
export const WINDOW_HEIGHT = 800
export const LEFT_PANEL_WIDTH = 300
export const BAR_WIDTH = 2

export const CUSTOM_TEMPLATE_SCHEMA = {
    type: 'object',
    properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        filenameSuffix: { type: 'string' },
        liquid: { type: 'string' },
        css: { type: 'string' },
    },
    required: ['id', 'name', 'liquid', 'css'],
}

export const SETTINGS_SCHEMA = {
    client_secret: {
        type: 'string',
        default: ''
    },
    client_id: {
        type: 'string',
        default: ''
    },
    page_size: {
        type: 'string',
        enum: ['a4', 'letter'],
        default: 'a4'
    },
    two_up: {
        type: 'boolean',
        default: true
    },
    past_plans: {
        type: 'boolean',
        default: false
    },
    draft_plans: {
        type: 'boolean',
        default: false
    },
    plans_quantity: {
        type: 'number',
        minimum: 1,
        maximum: 250,
        default: 10
    },
    template: {
        type: 'string',
        default: 'default'
    },
    name_style: {
        type: 'string',
        enum: ['first', 'first_initial', 'first_last'],
        default: 'first'
    },
    font_size: {
        type: 'number',
        minimum: 10,
        maximum: 24,
        default: 16
    },
    custom_templates: {
        type: 'array',
        items: CUSTOM_TEMPLATE_SCHEMA,
        default: []
    }
}

export const BOOK_MAPPING = {
    'GEN': 'Genesis',
    'EXO': 'Exodus',
    "LEV": 'Leviticus',
    "NUM": 'Numbers',
    "DEU": 'Deuteronomy',
    "JOS": 'Joshua',
    "JDG": 'Judges',
    "RUT": 'Ruth',
    "1SA": '1 Samuel',
    "2SA": '2 Samuel',
    "1KI": '1 Kings',
    "2KI": '2 Kings',
    "1CH": '1 Chronicles',
    "2CH": '2 Chronicles',
    "EZR": 'Ezra',
    "NEH": 'Nehemiah',
    "EST": 'Esther',
    "JOB": 'Job',
    "PSA": 'Psalm',
    "PRO": 'Proverbs',
    "ECC": 'Ecclesiastes',
    "SNG": 'Song of Songs',
    "ISA": 'Isaiah',
    "JER": 'Jeremiah',
    "LAM": 'Lamentations',
    "EZK": 'Ezekiel',
    "DAN": 'Daniel',
    "HOS": 'Hosea',
    "JOL": 'Joel',
    "AMO": 'Amos',
    "OBA": 'Obadiah',
    "JON": 'Jonah',
    "MIC": 'Micah',
    "NAM": 'Nahum',
    "HAB": 'Habakkuk',
    "ZEP": 'Zephaniah',
    "HAG": 'Haggai',
    "ZEC": 'Zechariah',
    "MAL": 'Malachi',
    "MAT": 'Matthew',
    "MRK": 'Mark',
    "LUK": 'Luke',
    "JHN": 'John',
    "ACT": 'Acts',
    "ROM": 'Romans',
    "1CO": '1 Corinthians',
    "2CO": '2 Corinthians',
    "GAL": 'Galatians',
    "EPH": 'Ephesians',
    "PHP": 'Philippians',
    "COL": 'Colossians',
    "1TH": '1 Thessalonians',
    "2TH": '2 THessalonians',
    "1TI": '1 Timothy',
    "2TI": '2 Timothy',
    "TIT": 'Titus',
    "PHM": 'Philemon',
    "HEB": 'Hebrews',
    "JAS": 'James',
    "1PE": '1 Peter',
    "2PE": '2 Peter',
    "1JN": '1 John',
    "2JN": '2 John',
    "3JN": '3 John',
    "JUD": 'Jude',
    "REV": 'Revelation'
}