import {Request, Response, Router} from "express";
import {App} from "~/server";

export class NetworkController {

    App: App
    router: Router
    mainEndpoint: string = "/api/v1/network/"

    constructor(mainClass: App) {
        this.router = Router()
        this.App = mainClass

        this.router.get('/status', (req: Request, res: Response) => {
            let responseObject = {
                config: this.App.MainModule.bancConfiguration
            }
            this.App.sendResponse(res, responseObject, {code: 200, message: "OK"})
        })

        this.router.get('/refresh', (req, res) => {
            this.App.NetworkModule.pingAllDevices()
            this.App.sendResponse(res, undefined, {code: 200, message: "Data refesh in action !"})
        })
    }
}
