import { EventEmitter } from 'node:events'
import * as path from 'node:path'
import { Liquid } from 'liquidjs'
import { getPlans } from './api'

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

    set planId(planId) {
        this.#planId = planId
        console.log('Setting current plan to ' + this.#planId)

        if (planId == '') {
            this.#planId = 0
            this.#showPlan = false
            this.#title = 'No plan selected'
            this.#plan = null
            this.#items = []
            this.#html = ''
        } else {

        }

        this.emit('planChanged', this.#planId)
    }

    get planId() {
        return this.#planId
    }

    get plans() {
        return this.#plans
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

}