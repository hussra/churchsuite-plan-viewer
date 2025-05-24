import { app, dialog, shell } from 'electron'
import { EventEmitter } from 'node:events'
import * as path from 'node:path'
import * as fs from 'fs'
import { Liquid } from 'liquidjs'
import coherentpdf from 'coherentpdf'
import { getPlans, getPlanDetail, getPlanItems } from './api'
import { win, rightView } from './window'


export class Controller extends EventEmitter {

    constructor() {
        super()
    }

    #liquidEngine = new Liquid({
        root: path.resolve(__dirname, 'views/'),
        extname: '.liquid'
    })

    #plans = []; // All available plans for selection
    #planId = 0; // Currently selected plan
    #showPlan = false; // Is currently selected plan available for viewing?
    #title = 'No plan selected';
    #plan = null;
    #items = [];
    #html = '';

    set selectedPlan(planId) {
        this.#planId = planId

        if ((planId == '') || (planId == 0)) {
            this.#planId = 0
            this.#showPlan = false
            this.#title = 'No plan selected'
            this.#plan = null
            this.#items = []
            this.#html = ''
            this.emit('viewChanged', this.#planId)
        } else {
            this.#planId = planId
            this.loadPlan()
        }
    }

    get selectedPlan() {
        return this.#planId
    }

    get plan() {
        return this.#plan
    }

    get showPlan() {
        return this.#showPlan
    }

    get title() {
        return this.#title
    }

    get plans() {
        return this.#plans
    }

    get html() {
        return this.#html
    }

    async loadPlans() {
        const planData = await getPlans()

        this.#plans = planData.data.map((plan) => {
            return {
                id: plan.id,
                date: plan.date
            }
        })
    }

    async loadPlan() {
        this.#plan = (await getPlanDetail(this.#planId)).data
        this.#items = (await getPlanItems(this.#planId)).data

        this.#title = this.#plan.date + " " + this.#plan.time + " - " + this.#plan.name

        this.#html = await this.#liquidEngine.renderFile('default', {
            plan: {
                plan: this.#plan,
                items: this.#items
            }
        })

        this.#showPlan = true

        this.emit('viewChanged')
    }


    async exportPDF() {
        dialog.showSaveDialog(win, {
            defaultPath: path.join(app.getPath('downloads'), this.#plan.date + '.pdf')
        }).then((result) => {
            if (result.cancelled) return

            let pdf
            let mergedPdf

            rightView.webContents.printToPDF({
                printBackground: true,
                pageSize: 'A4'
            }).then(data => {

                let twoUp = true // TODO take this from preferences!

                if (twoUp) {
                    pdf = coherentpdf.fromMemory(data, '')
                    mergedPdf = coherentpdf.mergeSimple([pdf, pdf])
                    coherentpdf.twoUp(mergedPdf)
                    coherentpdf.rotate(mergedPdf, coherentpdf.all(mergedPdf), 90)
                    coherentpdf.toFile(twoUp ? mergedPdf : pdf, result.filePath, false, false)
                } else {
                    fs.writeFileSync(result.filePath, data)
                }

                shell.openPath(result.filePath)
            }).catch((err) => {
                dialog.showMessageBox(win, {
                    type: 'error',
                    title: 'Unable to save file',
                    message: `Sorry, we were not able to save this plan to ${result.filePath} - is the file already open?`
                })
            }).finally(() => {
                coherentpdf.deletePdf(mergedPdf)
                coherentpdf.deletePdf(pdf)
            })

        })

    }

}