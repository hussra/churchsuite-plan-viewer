export class TemplateStore {
    
    constructor(controller) {
        this.#controller = controller
    }

    #controller

    // TODO: Get this from the filesystem
    // TODO: Get these editable and loadable from settings
    #templates = [
        {
            id: 'default',
            name: 'Elmdon Summary',
            filenameSuffix: ''
        },
        {
            id: 'full',
            name: 'Elmdon Full Details',
            filenameSuffix: '-full'
        }
    ]

    get allTemplates() {
        return this.#templates
    }

    getTemplateById(id) {
        return this.#templates.find((element) => (element.id == id))
    }
}