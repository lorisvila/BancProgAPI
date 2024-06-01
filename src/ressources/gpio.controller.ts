import {App} from "~/server";
import {Router} from "express";

export class GpioController {

    router: Router
    App: App
    mainEndpoint: string = "/api/v1/gpio"

    constructor(mainClass: App) {
        this.App = mainClass
        this.router = Router()

        this.router.get('/set/:card/:pin/:state', (req, res) => {
            let card = req.params.card
            let pin = req.params.pin
            let state = req.params.state
            if (card == "" || pin == "" || !["HIGH", "LOW", "1", "0"].includes(state)) {
                this.App.sendResponse(res, undefined, {code: 400, message: "Bad request..."})
            } else {
                this.App.sendResponse(res, undefined, {code: 200, message: "Not implemented yet..."})
            }
        })

    }


}