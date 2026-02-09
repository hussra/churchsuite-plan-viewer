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

import { STANZA_TYPES, IGNORE_EMPTY_STANZA_TYPES } from "./constants"

export class ChartEngine {

    constructor(controller) {
        this.#controller = controller
    }

    #controller

    chartToStanzas(chart) {
        const stanzas = []

        const lines = chart.split('\n')

        for (let line of lines) {
            line = line.trim().replace(/\[.*?\]/g, '').trim()
            var stanzaName = this.#isStanzaHeader(line)

            if (stanzaName) {
                stanzas.push({
                    name: stanzaName,
                    lines: []
                })
            } else if (line === '') {
                // Skip empty lines
            } else if (stanzas.length > 0) {
                stanzas[stanzas.length - 1].lines.push(line)
            } else {
                stanzas.push({
                    name: 'UNKNOWN',
                    lines: [line]
                })
            }
        }

        // Remove empty stanzas if they are in the ignore list
        for (const [i, stanza] of stanzas.entries()) {
            if ( (stanza.lines.length === 0) && (this.#isIgnoreEmptyStanza(stanza.name))) {
                stanzas.splice(i, 1)
            } else {
                // Find a previous stanza with the same name
                const previousStanza = stanzas.slice(0, i).find(s => s.name === stanza.name)
                if (previousStanza) {
                    stanza.lines.push(previousStanza.lines[0] + ' ...')
                }
            }
        }

        return stanzas
    }

    #isStanzaHeader(line) {
        for (const type of STANZA_TYPES) {
            if (line.toUpperCase().startsWith(type)) {
                return line.replace(/:$/, '')
            }
        }
        return false
    }

    #isIgnoreEmptyStanza(line) {
        for (const type of IGNORE_EMPTY_STANZA_TYPES) {
            if (line.toUpperCase().startsWith(type)) {
                return true
            }
        }
        return false
    }

}