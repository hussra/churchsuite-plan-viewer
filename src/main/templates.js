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
import { css } from 'webpack';
import { json } from 'node:stream/consumers';

export class TemplateStore {
    
    constructor(controller) {
        this.#controller = controller

        const viewDir = path.resolve(__dirname, '../../views/')
        let files = fs.readdirSync(viewDir, { withFileTypes: true })
        
        // Find .liquid files in this directory
        files.forEach(file => {
            if (file.isFile() && (path.extname(file.name) === '.liquid')) {
            let basename = path.basename(file.name, '.liquid')

                const cssFile = path.resolve(viewDir, basename + '.css')
                const jsonFile = path.resolve(viewDir, basename + '.tpl')
                try {
                    fs.accessSync(cssFile, fs.constants.R_OK)
                    fs.accessSync(jsonFile, fs.constants.R_OK)

                    const jsonData = JSON.parse(fs.readFileSync(jsonFile))

                    this.#templates.push({
                        id: basename,
                        name: (jsonData.name ? jsonData.name : basename),
                        filenameSuffix: (jsonData.filenameSuffix ? jsonData.filenameSuffix : ''),
                        editable: false,
                    })
                } catch (err) {
                }
            }
        })

    }

    #controller

    // TODO: Get these editable and loadable from settings
    #templates = []

    get allTemplates() {
        return this.#templates
    }

    getTemplateById(id) {
        return this.#templates.find((element) => (element.id == id))
    }

    getCSSById(id) {
        let template = this.getTemplateById(id)
        let cssFile = path.resolve(__dirname, 'views/', template.id + '.css')
        let fileContent = fs.readFileSync(cssFile, "UTF-8")
        return fileContent
    }
}