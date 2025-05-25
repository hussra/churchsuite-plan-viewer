import { app, dialog, shell } from 'electron'
import { EventEmitter } from 'node:events'
import * as path from 'node:path'
import * as fs from 'fs'
import { Liquid } from 'liquidjs'
import coherentpdf from 'coherentpdf'
import { getPlans, getPlanDetail, getPlanItems } from './api'
import { win, rightView } from './window'
import { store } from './settings'

export class Controller extends EventEmitter {

    constructor() {
        super()
    }

    #liquidEngine = new Liquid({
        root: path.resolve(__dirname, 'views/'),
        extname: '.liquid'
    })

    #allPlans = [];                          // All available plans for selection
    #showPlanView = false;                   // Is currently selected plan available for viewing?

    #selectedPlanId = 0;                     // Currently selected plan
    #selectedPlanTitle = 'No plan selected';
    #selectedPlanDetail = null;
    #selectedPlanItems = [];
    #selectedPlanHtml = '';

    set selectedPlanId(planId) {
        this.#selectedPlanId = planId

        if ((planId == '') || (planId == 0)) {
            this.#selectedPlanId = 0
            this.#showPlanView = false
            this.#selectedPlanTitle = 'No plan selected'
            this.#selectedPlanDetail = null
            this.#selectedPlanItems = []
            this.#selectedPlanHtml = ''

            this.emit('viewChanged', this.#selectedPlanId)
        } else {
            this.#selectedPlanId = planId
            this.loadPlan()
        }
    }

    get allPlans() {
        return this.#allPlans
    }

    get selectedPlanId() {
        return this.#selectedPlanId
    }

    get selectedPlanDetail() {
        return this.#selectedPlanDetail
    }

    get showPlanView() {
        return this.#showPlanView
    }

    get selectedPlanTitle() {
        return this.#selectedPlanTitle
    }

    get selectedPlanHtml() {
        return this.#selectedPlanHtml
    }

    async loadPlans() {
        const planData = await getPlans()

        this.#allPlans = planData.data.map((plan) => {
            return {
                id: plan.id,
                date: plan.date
            }
        })
    }

    async loadPlan() {
        this.#selectedPlanDetail = (await getPlanDetail(this.#selectedPlanId)).data
        this.#selectedPlanItems = (await getPlanItems(this.#selectedPlanId)).data

        this.#selectedPlanTitle = this.#selectedPlanDetail.date + " " + this.#selectedPlanDetail.time + " - " + this.#selectedPlanDetail.name

        this.#selectedPlanHtml = await this.#liquidEngine.renderFile('default', {
            plan: {
                plan: this.#selectedPlanDetail,
                items: this.#selectedPlanItems
            }
        })

        this.#showPlanView = true

        this.emit('viewChanged')
    }


    async exportPDF() {
        // TODO: Don't like this bit being here rather than in window.js
        dialog.showSaveDialog(win, {
            defaultPath: path.join(app.getPath('downloads'), this.#selectedPlanDetail.date + '.pdf')
        }).then((result) => {
            if (result.cancelled) return

            let pdf
            let mergedPdf

            // TODO: Don't like this bit being here rather than in window.js
            rightView.webContents.printToPDF({
                printBackground: true,
                pageSize: store.get('page_size')
            }).then(data => {

                let twoUp = store.get('two_up')

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
                // TODO: Don't like this bit being here rather than in window.js
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