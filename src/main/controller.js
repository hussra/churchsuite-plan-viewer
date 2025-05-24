import { EventEmitter } from 'node:events'
import * as path from 'node:path'
import { Liquid } from 'liquidjs'
import { getPlans, getPlanDetail, getPlanItems } from './api'

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

}