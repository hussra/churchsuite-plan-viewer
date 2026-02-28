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

import * as path from 'node:path'
import * as fs from 'fs'
import { app } from 'electron'
import { HtmlRenderer, Parser } from 'commonmark'
import DOMPurify from 'dompurify'
import { JSDOM } from 'jsdom'
import { Liquid } from 'liquidjs'
import { nanoid } from 'nanoid'

import { BOOK_MAPPING } from './constants'

export class LayoutEngine {

    constructor(controller) {
        this.#controller = controller
        this.#buildLayoutList()
        this.#buildLiquidEngine()
    }

    #controller
    #liquidEngine

    #buildLayoutList() {
        
        const layoutsDir = this.layoutDir

        // Find .liquid files in this directory which also have corresponding .css and .json files
        let files = fs.readdirSync(layoutsDir, { withFileTypes: true })
        files.forEach(file => {
            if (file.isFile() && (path.extname(file.name) === '.liquid')) {
                let basename = path.basename(file.name, '.liquid')

                const cssFile = path.resolve(layoutsDir, basename + '.css')
                const jsonFile = path.resolve(layoutsDir, basename + '.json')
                try {
                    fs.accessSync(cssFile, fs.constants.R_OK)
                    fs.accessSync(jsonFile, fs.constants.R_OK)

                    const jsonData = JSON.parse(fs.readFileSync(jsonFile))

                    const tmpl = {
                        name: jsonData.name,
                        filenameSuffix: jsonData.filenameSuffix,
                        liquid: this.#getLayoutLiquidFromDisk(basename),
                        css: this.#getLayoutCSSFromDisk(basename),
                        hide_settings: jsonData.hide_settings,
                        editable: false,
                        font_size: (jsonData.font_size ? jsonData.font_size : this.#controller.getGlobalSetting(`layouts.${basename}.font_size`)),
                        name_style: (jsonData.name_style ? jsonData.name_style : this.#controller.getGlobalSetting(`layouts.${basename}.name_style`)),
                        song_lyrics: (jsonData.song_lyrics ? jsonData.song_lyrics : this.#controller.getGlobalSetting(`layouts.${basename}.song_lyrics`)),
                        page_size: (jsonData.page_size ? jsonData.page_size : this.#controller.getGlobalSetting(`layouts.${basename}.page_size`)),
                        two_up: (jsonData.two_up ? jsonData.two_up : this.#controller.getGlobalSetting(`layouts.${basename}.two_up`)),
                        page_numbers: (jsonData.page_numbers ? jsonData.page_numbers : this.#controller.getGlobalSetting(`layouts.${basename}.page_numbers`)),
                        timings: (jsonData.timings ? jsonData.timings : this.#controller.getGlobalSetting(`layouts.${basename}.timings`)),
                        time_format: (jsonData.time_format ? jsonData.time_format : this.#controller.getGlobalSetting(`layouts.${basename}.time_format`)),
                    }

                    this.#controller.setGlobalSetting(`layouts.${basename}`, tmpl)
                } catch (err) {
                    console.warn('Skipping layout ' + basename + ' due to ' + err.message)
                }
            }
        })
    }

    #buildLiquidEngine() {
        this.#liquidEngine = new Liquid({
            jsTruthy: true,
            fs: {
                readFile: (filePath) => {
                    return this.getLayoutById(filePath).liquid
                },
                readFileSync: (filePath) => {
                    return this.getLayoutById(filePath).liquid
                },
                exists: (filePath) => {
                    return this.layoutExists(filePath)
                },
                existsSync: (filePath) => {
                    return this.layoutExists(filePath)
                },
                contains: (filePath) => {
                    return this.layoutExists(filePath)
                },
                resolve: (root, file, ext) => {
                    return file
                },
                sep: '/',
                dirname: (filePath) => {
                    return ''
                }
            }
        })
        this.#liquidEngine.registerFilter('bibleBook', this.#bibleBookFilter)
        this.#liquidEngine.registerFilter('markdown', this.#markdownFilter)
        this.#liquidEngine.registerFilter('personName', this.#personNameFilter.bind(this))
        this.#liquidEngine.registerFilter('songKey', this.#songKeyFilter)
        this.#liquidEngine.registerFilter('songCredits', this.#songCreditsFilter.bind(this))
    }

    // Directory containing pre-defined plan layouts
    get layoutDir() {
        return app.isPackaged ? path.join(process.resourcesPath, "app.asar", ".webpack", "main", "templates") : "templates"
    }

    // Get array of layout IDs and names
    get allLayouts() {
        return Object.entries(this.#controller.getGlobalSetting('layouts'))
            .map(([key, layout]) => ({
                id: key,
                name: layout.name,
                editable: layout.editable
            }))
            .sort((a, b) => 
                // Out-of-the-box layouts (editable: false) before user layouts (editable: true),
                // then sorted alphabetically by name within those groups
                ((a.editable === b.editable) ? 0 : a.editable ? 1 : -1) || a.name.localeCompare(b.name)
            )
    }

    layoutExists(id) {
        return (this.getLayoutById(id) !== undefined)
    }

    getLayoutById(id) {
        const layout = this.#controller.getGlobalSetting(`layouts.${id}`)
        return (layout ? { ...layout, id: id } : undefined)
    }

    duplicateLayout(id) {
        if (!(this.layoutExists(id))) {
            throw new Error('Layout does not exist')
        }

        let newLayout = Object.assign({}, this.getLayoutById(id))
        const newId = nanoid()
        delete newLayout.id
        newLayout.name = newLayout.name + ' (Copy)'

        // If copying an out-of-the-box layout, strip out any GPL licence at the start of the layout
        if (!newLayout.editable) {
            newLayout.liquid = this.#stripGPL(newLayout.liquid, '{% comment %}', '{% endcomment %}')
            newLayout.css = this.#stripGPL(newLayout.css, '/*', '*/')
        }
        newLayout.editable = true

        // Save to settings
        this.#controller.setGlobalSetting(`layouts.${newId}`, newLayout)

        this.#controller.emit('layoutsChanged', newId)
        return newId
    }

    #stripGPL(text, startToken, endToken) {
        if (text.startsWith(startToken) && text.includes(endToken)) {
            let endIndex = text.indexOf(endToken) + endToken.length
            let comment = text.slice(0, endIndex)
            if (comment.toLowerCase().includes('gnu general public license')) {
                return text.slice(endIndex).trim()
            }
        }
        return text
    }

    importLayout(layout, generateNewId) {
        const id = (generateNewId ? nanoid() : layout.id)
        delete layout.id
        layout.editable = true

        this.#controller.setGlobalSetting(`layouts.${id}`, layout)
        this.#controller.emit('layoutsChanged')
        return id
    }

    saveLayout(layout) {
        const id = layout.id
        if (!(this.layoutExists(layout.id))) {
            throw new Error('Layout does not exist')
        }
        if (!this.getLayoutById(id).editable) {
            throw new Error('Layout is not editable')
        }
        delete layout.id

        // Augment layout from editor with missing per-layout properties from the existing layout before saving
        const existingLayout = this.getLayoutById(id)
        if (existingLayout) {
            layout = {
                ...layout,
                font_size: existingLayout.font_size,
                name_style: existingLayout.name_style,
                song_lyrics: existingLayout.song_lyrics,
                page_size: existingLayout.page_size,
                two_up: existingLayout.two_up,
                page_numbers: existingLayout.page_numbers,
                timings: existingLayout.timings,
                time_format: existingLayout.time_format,
            }
        }

        this.#controller.setGlobalSetting(`layouts.${id}`, layout)
        this.#controller.emit('layoutsChanged')
    }

    deleteLayout(id) {
        if (!(this.layoutExists(id))) {
            throw new Error('Layout does not exist')
        }

        const layout = this.getLayoutById(id)
        if (!layout.editable) {
            throw new Error('Layout is not editable')
        }

        this.#controller.deleteGlobalSetting(`layouts.${id}`)

        this.#controller.selectedLayoutId = ''
        this.#controller.emit('layoutsChanged')
    }

    #getLayoutCSSFromDisk(id) {
        const cssFile = path.resolve(__dirname, 'templates/', id + '.css')
        return fs.readFileSync(cssFile, "UTF-8")
    }

    renderPlanCSS(id, plan) {
        if (!(this.layoutExists(id))) {
            throw new Error('Layout does not exist')
        }

        const baseFontSize = this.#controller.getLayoutSetting('font_size')
        const primaryColor = plan.brand.color
        const topCSS = `:root {
            font-size: ${baseFontSize}px;
            --primary-color: ${primaryColor};
        }\n\n`

        return topCSS + this.getLayoutById(id).css
    }

    #getLayoutLiquidFromDisk(id) {
        const liquidFile = path.resolve(__dirname, 'templates/', id + '.liquid')
        return fs.readFileSync(liquidFile, "UTF-8")
    }

    async renderPlanHTML(id, plan) {
        if (!(this.layoutExists(id))) {
            throw new Error('Layout does not exist')
        }
        const rawHtml = await this.#liquidEngine.renderFile(
            id,
            plan
        )

        const window = new JSDOM('').window
        const purify = DOMPurify(window)
        return purify.sanitize(rawHtml)
    }

    async renderPlanTitle(plan) {
        if (this.#controller.getGlobalSetting('show_templates')) {
            return await this.#liquidEngine.parseAndRender('Undated template - {{plan.detail.name}}', plan)
        } else {
            return await this.#liquidEngine.parseAndRender('{{plan.detail.date_time | date: "%A %e %b %Y, %l.%M%P"}} - {{plan.detail.name}}', plan)
        }
    }

    async renderPlanDateTimeShort(date_time) {
       return await this.#liquidEngine.parseAndRender(
            '{{date_time | date: "%d-%m-%Y %H:%M"}}',
            {
                date_time: date_time
            }
        )
    }

    async renderPlanTitleShort(date_time, name) {
        return await this.renderPlanDateTimeShort(date_time) + ' ' + name
    }

    #bibleBookFilter(abbr) {
        let name = BOOK_MAPPING[abbr]
        if (name === undefined) {
            return abbr
        }
        return name
    }

    #markdownFilter(md) {
        const reader = new Parser({ smart: true })
        const writer = new HtmlRenderer({ softbreak: "<br />" })
        const parsed = reader.parse(md)
        return writer.render(parsed)
    }

    #personNameFilter(person, style = this.#controller.getLayoutSetting('name_style')) {
        switch(style) {
            case 'first':
                return person.first_name
            case 'first_initial':
                return person.first_name + ' ' + person.last_name.charAt(0)
            case 'first_last':
                return person.first_name + ' ' + person.last_name
        }
    }

    #songKeyFilter(item) {
        if (item.type == 'song' && item.settings && item.settings.key) {

            let key = item.settings.key

            if (key.endsWith('b')) {
                key = key.replace('b', '&flat;')
            } else if (key.endsWith('#')) {
                key = key.replace('#', '&sharp;')
            }

            if (item.settings.scale == 'minor') {
                key += 'm'
            }
            return `<span class="song-key">${key}</span>`
            
        } else {
            return ''
        }
    }

    #songCreditsFilter(item) {
        if (item.type == 'song' && item.arrangement && item.song) {
            let credits = `"${item.song.name}" by ${item.arrangement.artist}`
            if (item.song.copyright != '') {
                if (item.song.copyright.startsWith('Public Domain')) {
                    credits += ' (Public Domain)'
                } else { 
                    credits += ` &copy; ${item.song.copyright}`
                    if (item.song.administration && item.song.administration != '') {
                        credits += ` (Admin. ${item.song.administration})`
                    }
                    const ccli_licence = this.#controller.getGlobalSetting('ccli_licence')
                    if (ccli_licence && (ccli_licence > 1) && item.song.ccli && (item.song.ccli != '')) {
                        credits += ` Used by permission. CCLI Licence No. ${ccli_licence}`
                    }
                }
            }
            return credits
        }
    }
}