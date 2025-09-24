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

import { BOOK_MAPPING } from './constants'
import { nanoid } from 'nanoid'

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
                } catch (err) {
                    console.warn('Skipping template ' + basename + ' due to ' + err.message)
                }
            }
        })

        // Load any custom templates from settings
        let customTemplates = this.#controller.getSetting('custom_templates')
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
    }

    // Directory containing pre-defined plan templates
    get templatesDir() {
        return app.isPackaged ? path.join(process.resourcesPath, "app.asar", ".webpack", "main", "templates") : "templates"
    }

    get allTemplates() {
        return this.#templates
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
        newTemplate.editable = true

        // Save to settings
        let allTemplates = this.#controller.getSetting('custom_templates')
        this.#controller.saveSetting('custom_templates', allTemplates.concat([newTemplate]))

        // Save locally
        this.#templates.push(newTemplate)
        this.#controller.emit('templatesChanged', newTemplate.id)

        return newTemplate.id
    }

    saveTemplate(template) {
        if (!(this.templateExists(template.id))) {
            throw new Error('Template does not exist')
        }
        let allTemplates = this.#controller.getSetting('custom_templates')
        let index = allTemplates.findIndex((element) => (element.id == template.id))
        if (index === -1) {
            throw new Error('Template does not exist in settings')
        }

        if (!(allTemplates[index].editable)) {
            throw new Error('Template is not editable')
        }

        allTemplates[index] = template
        this.#controller.saveSetting('custom_templates', allTemplates)
        let localIndex = this.#templates.findIndex((element) => (element.id == template.id))
        this.#templates[localIndex] = template
        this.#controller.emit('templatesChanged')
    }

    deleteTemplate(id) {
        if (!(this.templateExists(id))) {
            throw new Error('Template does not exist')
        }
        let allTemplates = this.#controller.getSetting('custom_templates')
        let index = allTemplates.findIndex((element) => (element.id == id))
        if (index === -1) {
            throw new Error('Template does not exist in settings')
        }

        if (!(allTemplates[index].editable)) {
            throw new Error('Template is not editable')
        }
        allTemplates.splice(index, 1)
        this.#controller.saveSetting('custom_templates', allTemplates)

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

        let primaryColor = plan.plan.brand.color
        let topCSS = `:root {
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

    #personNameFilter(person, style = this.#controller.getSetting('name_style')) {
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
            key.replace('b', '&flat;')
            if (item.settings.scale == 'minor') {
                key += 'm'
            }
            return `<span class="song-key">${key}</span>`
        } else {
            return ''
        }
    }
}