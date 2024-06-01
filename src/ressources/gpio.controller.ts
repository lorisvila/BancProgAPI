import {App} from "~/server";
import {Router} from "express";
import {GPIOError} from "~/types/errors";

export class GpioController {

    router: Router
    App: App
    mainEndpoint: string = "/api/v1/gpio"

    constructor(mainClass: App) {
        this.App = mainClass
        this.router = Router()

        this.router.put('/write/:card/:pin/:state', (req, res) => {
            let card = req.params.card
            let pin = req.params.pin
            let state = req.params.state
            if (card == "" || pin == "" || !["HIGH", "LOW", "1", "0"].includes(state)) {
                this.App.sendResponse(res, undefined, {code: 400, message: "Bad request..."})
                return
            }
            this.App.sendResponse(res, undefined, {code: 200, message: "Not implemented yet..."})
        })

        this.router.get('/read/:card/:pin', (req, res) => {
            let card = req.params.card
            let pin = req.params.pin
            if (card == "" || pin == "") {
                this.App.sendResponse(res, undefined, {code: 400, message: "Bad request..."})
                return;
            }
            try {
                let state = this.App.GpioModule.readPinInterface(card, pin)
                this.App.sendResponse(res, state, {code: 200, message: "OK"})
            } catch (error) {
                if (error instanceof GPIOError) {
                    this.App.sendResponse(res, undefined, {code: error.code, message: error.message})
                    return;
                } else {
                    throw error;
                }
            }
        })

    }


}