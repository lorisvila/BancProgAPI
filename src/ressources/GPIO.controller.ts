import {App} from "~/server";
import {Request, Response, Router} from "express";
import {GPIOError} from "~/types/errors";
import {Card, CardPin, GPIOModule} from "~/types/types";

export class GpioController {

    router: Router
    App: App
    baseEndpoint: string = "/api/v1/gpio"

    constructor(mainClass: App) {
        this.App = mainClass
        this.router = Router()

        this.router.get('/write/:card/:numberOnCard/:state', (req: Request, res: Response) => {
            let card: string = req.params.card
            let numberOnCard: string = req.params.numberOnCard
            let state: string = req.params.state
            if (card == "" || numberOnCard == "" || !["true", "false"].includes(state)) {
                this.App.sendResponse(res, undefined, {code: 400, message: "Bad request..."})
                return
            }
            let value = JSON.parse(state)
            try {
                let response = this.App.GpioModule.writeValueToGPIO(card, numberOnCard, value)
                this.App.sendResponse(res, response, {code: 200, message: "OK"})
            } catch (error) {
                if (error instanceof GPIOError) {
                    this.App.sendResponse(res, undefined, {code: error.code, message: error.message})
                    return;
                } else {
                    throw error;
                }
            }
        })

        this.router.get('/read/:card/:numberOnCard', (req: Request, res: Response) => {
            let card: string = req.params.card
            let numberOnCard: string = req.params.numberOnCard
            if (card == "" || numberOnCard == "") {
                this.App.sendResponse(res, undefined, {code: 400, message: "Bad request..."})
                return;
            }
            try {
                let response: CardPin = this.App.GpioModule.readPinValueFromGPIO(card, numberOnCard)
                this.App.sendResponse(res, response, {code: 200, message: "OK"})
            } catch (error) {
                if (error instanceof GPIOError) {
                    this.App.sendResponse(res, undefined, {code: error.code, message: error.message})
                    return;
                } else {
                    throw error;
                }
            }
        })

        this.router.get('/read/:card', (req: Request, res: Response) => {
            let card: string = req.params.card
            if (card == "") {
                this.App.sendResponse(res, undefined, {code: 400, message: "Bad request..."})
                return;
            }
            try {
                let response: Card = this.App.GpioModule.readCardValuesFromGPIO(card)
                this.App.sendResponse(res, response, {code: 200, message: "OK"})
            } catch (error) {
                if (error instanceof GPIOError) {
                    this.App.sendResponse(res, undefined, {code: error.code, message: error.message})
                    return;
                } else {
                    throw error;
                }
            }
        })

        this.router.get('/readAllCards/', (req: Request, res: Response) => {
           try {
                let response: Card[] = this.App.GpioModule.readAllCards()
                this.App.sendResponse(res, response, {code: 200, message: "OK"})
            } catch (error) {
                if (error instanceof GPIOError) {
                    this.App.sendResponse(res, undefined, {code: error.code, message: error.message})
                    return;
                } else {
                    throw error;
                }
            }
        })

        this.router.get('/readModule/:module', (req: Request, res: Response) => {
            let module: string = req.params.module
            if (module == "" || Number.isNaN(module)) {
                this.App.sendResponse(res, undefined, {code: 400, message: "Bad request..."})
                return;
            }
            try {
                let response: GPIOModule = this.App.GpioModule.getModule(parseInt(module))
                this.App.sendResponse(res, response, {code: 200, message: "OK"})
            } catch (error) {
                if (error instanceof GPIOError) {
                    this.App.sendResponse(res, undefined, {code: error.code, message: error.message})
                    return;
                } else {
                    throw error;
                }
            }
        })

        this.router.get('/readAllModules', (req: Request, res: Response) => {
            try {
                let response: GPIOModule[] = this.App.GpioModule.getAllModules()
                this.App.sendResponse(res, response, {code: 200, message: "OK"})
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