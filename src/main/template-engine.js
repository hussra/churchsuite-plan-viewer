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

export class TemplateEngine {

    constructor(controller) {
        this.#controller = controller
        this.#buildTemplateList()
        this.#buildLiquidEngine()
    }

    #controller
    #liquidEngine

    #templates = []

    #buildTemplateList() {
        
        const templatesDir = this.templatesDir

        // Find .liquid files in this directory which also have corresponding .css and .json files
        let files = fs.readdirSync(templatesDir, { withFileTypes: true })
        files.forEach(file => {
            if (file.isFile() && (path.extname(file.name) === '.liquid')) {
                let basename = path.basename(file.name, '.liquid')

                const cssFile = path.resolve(templatesDir, basename + '.css')
                const jsonFile = path.resolve(templatesDir, basename + '.json')
                try {
                    fs.accessSync(cssFile, fs.constants.R_OK)
                    fs.accessSync(jsonFile, fs.constants.R_OK)

                    const jsonData = JSON.parse(fs.readFileSync(jsonFile))

                    this.#templates.push({
                        id: basename,
                        name: (jsonData.name ? jsonData.name : basename),
                        filenameSuffix: (jsonData.filenameSuffix ? jsonData.filenameSuffix : ''),
                        editable: false,
                        liquid: this.#getTemplateLiquidFromDisk(basename),
                        css: this.#getTemplateCSSFromDisk(basename)
                    })

                    // Load into settings if not already present, so that template settings can be edited by the user and saved against the template
                    const tmpl = {
                        name: jsonData.name,
                        filenameSuffix: jsonData.filenameSuffix,
                        liquid: this.#getTemplateLiquidFromDisk(basename),
                        css: this.#getTemplateCSSFromDisk(basename),
                        editable: false,
                        font_size: (jsonData.font_size ? jsonData.font_size : this.#controller.getGlobalSetting(`templates.${basename}.font_size`)),
                        name_style: (jsonData.name_style ? jsonData.name_style : this.#controller.getGlobalSetting(`templates.${basename}.name_style`)),
                        song_lyrics: (jsonData.song_lyrics ? jsonData.song_lyrics : this.#controller.getGlobalSetting(`templates.${basename}.song_lyrics`)),
                        page_size: (jsonData.page_size ? jsonData.page_size : this.#controller.getGlobalSetting(`templates.${basename}.page_size`)),
                        two_up: (jsonData.two_up ? jsonData.two_up : this.#controller.getGlobalSetting(`templates.${basename}.two_up`)),
                        page_numbers: (jsonData.page_numbers ? jsonData.page_numbers : this.#controller.getGlobalSetting(`templates.${basename}.page_numbers`)),
                    }

                    this.#controller.setGlobalSetting(`templates.${basename}`, tmpl)
                } catch (err) {
                    console.warn('Skipping template ' + basename + ' due to ' + err.message)
                }
            }
        })

        // Load any custom templates from settings
        let customTemplates = this.#controller.getGlobalSetting('custom_templates')
        for (let i in customTemplates) {
            let customTemplate = customTemplates[i]
            customTemplate.editable = true
            this.#templates.push(
                customTemplate
            )
        }
    }

    #buildLiquidEngine() {
        this.#liquidEngine = new Liquid({
            jsTruthy: true,
            fs: {
                readFile: (filePath) => {
                    return this.getTemplateById(filePath).liquid
                },
                readFileSync: (filePath) => {
                    return this.getTemplateById(filePath).liquid
                },
                exists: (filePath) => {
                    return this.templateExists(filePath)
                },
                existsSync: (filePath) => {
                    return this.templateExists(filePath)
                },
                contains: (filePath) => {
                    return this.templateExists(filePath)
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

    // Directory containing pre-defined plan templates
    get templatesDir() {
        return app.isPackaged ? path.join(process.resourcesPath, "app.asar", ".webpack", "main", "templates") : "templates"
    }

    // Get array of template IDs and names
    get allTemplates() {
        return Object.entries(this.#controller.getGlobalSetting('templates'))
            .map(([key, template]) => {
                return {
                    id: key,
                    name: template.name,
                    editable: template.editable
                }
            })
            .sort((a, b) => {
                // Out-of-the-box templates (editable: false) before user templates (editable: true),
                // then sorted alphabetically by name within those groups
                return ((a.editable === b.editable) ? 0 : a.editable ? 1 : -1) || a.name.localeCompare(b.name)
            })
    }

    templateExists(id) {
        return (this.getTemplateById(id) !== undefined)
    }

    getTemplateById(id) {
        return this.#templates.find((element) => (element.id == id))
    }

    duplicateTemplate(id) {
        if (!(this.templateExists(id))) {
            throw new Error('Template does not exist')
        }

        let newTemplate = Object.assign({}, this.getTemplateById(id))
        newTemplate.id = nanoid()
        newTemplate.name = newTemplate.name + ' (Copy)'

        // If copying an out-of-the-box template, strip out any GPL licence at the start of the template
        if (!newTemplate.editable) {
            newTemplate.liquid = this.#stripGPL(newTemplate.liquid, '{% comment %}', '{% endcomment %}')
            newTemplate.css = this.#stripGPL(newTemplate.css, '/*', '*/')
        }
        newTemplate.editable = true

        // Save to settings
        let allTemplates = this.#controller.getGlobalSetting('custom_templates')
        this.#controller.setGlobalSetting('custom_templates', allTemplates.concat([newTemplate]))

        // Save locally
        this.#templates.push(newTemplate)
        this.#controller.emit('templatesChanged', newTemplate.id)

        return newTemplate.id
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

    importTemplate(template, generateNewId) {
        // Get the new template record ready to import
        template.editable = true

        if (generateNewId) {
            template.id = nanoid()
        }

        // Search for this template's ID in our existing settings
        let allTemplates = this.#controller.getGlobalSetting('custom_templates')
        let index = allTemplates.findIndex((element) => (element.id == template.id))

        if (generateNewId || index === -1) {

            // Save to settings
            this.#controller.setGlobalSetting('custom_templates', allTemplates.concat([template]))

            // Save locally
            this.#templates.push(template)
            this.#controller.emit('templatesChanged', template.id)

            return template.id

        } else {

            // Save to settings
            let allTemplates = this.#controller.getGlobalSetting('custom_templates')
            let index = allTemplates.findIndex((element) => (element.id == template.id))
            allTemplates[index] = template
            this.#controller.setGlobalSetting('custom_templates', allTemplates)

            // Save locally
            let localIndex = this.#templates.findIndex((element) => (element.id == template.id))
            this.#templates[localIndex] = template
            this.#controller.emit('templatesChanged')
        
            return template.id
        }
    }

    saveTemplate(template) {
        if (!(this.templateExists(template.id))) {
            throw new Error('Template does not exist')
        }
        let allTemplates = this.#controller.getGlobalSetting('custom_templates')
        let index = allTemplates.findIndex((element) => (element.id == template.id))
        if (index === -1) {
            throw new Error('Template does not exist in settings')
        }

        if (!(allTemplates[index].editable)) {
            throw new Error('Template is not editable')
        }

        allTemplates[index] = template
        this.#controller.setGlobalSetting('custom_templates', allTemplates)
        let localIndex = this.#templates.findIndex((element) => (element.id == template.id))
        this.#templates[localIndex] = template
        this.#controller.emit('templatesChanged')
    }

    deleteTemplate(id) {
        if (!(this.templateExists(id))) {
            throw new Error('Template does not exist')
        }
        let allTemplates = this.#controller.getGlobalSetting('custom_templates')
        let index = allTemplates.findIndex((element) => (element.id == id))
        if (index === -1) {
            throw new Error('Template does not exist in settings')
        }

        if (!(allTemplates[index].editable)) {
            throw new Error('Template is not editable')
        }
        allTemplates.splice(index, 1)
        this.#controller.setGlobalSetting('custom_templates', allTemplates)

        let localIndex = this.#templates.findIndex((element) => (element.id == id))
        this.#templates.splice(localIndex, 1)
        this.#controller.selectedTemplateId = ''
        this.#controller.emit('templatesChanged')
    }

    #getTemplateCSSFromDisk(id) {
        const cssFile = path.resolve(__dirname, 'templates/', id + '.css')
        return fs.readFileSync(cssFile, "UTF-8")
    }

    renderPlanCSS(id, plan) {
        if (!(this.templateExists(id))) {
            throw new Error('Template does not exist')
        }

        const baseFontSize = this.#controller.getTemplateSetting('font_size')
        const primaryColor = plan.brand.color
        const topCSS = `:root {
            font-size: ${baseFontSize}px;
            --primary-color: ${primaryColor};
        }\n\n`

        return topCSS + this.getTemplateById(id).css
    }

    #getTemplateLiquidFromDisk(id) {
        const liquidFile = path.resolve(__dirname, 'templates/', id + '.liquid')
        return fs.readFileSync(liquidFile, "UTF-8")
    }

    async renderPlanHTML(id, plan) {
        if (!(this.templateExists(id))) {
            throw new Error('Template does not exist')
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
        return await this.#liquidEngine.parseAndRender('{{plan.detail.date_time | date: "%A %e %b %Y, %l.%M%P"}} - {{plan.detail.name}}', plan)
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

    #personNameFilter(person, style = this.#controller.getTemplateSetting('name_style')) {
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
                    if (ccli_licence && (ccli_licence > 1)) {
                        credits += ` Used by permission. CCLI Licence No. ${ccli_licence}`
                    }
                }
            }
            return credits
        }
    }
}