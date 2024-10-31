import {Request, Response, Router} from "express";
import {App} from "~/server";
import {ConfigNetworking} from "~/types/types";

export class NetworkController {

    App: App
    router: Router
    baseEndpoint: string = "/api/v1/network/"

    constructor(mainClass: App) {
        this.router = Router()
        this.App = mainClass

        this.router.get('/networkDevicesStatus', (req: Request, res: Response) => {
            this.App.NetworkModule.pingAllDevices()
            let response: ConfigNetworking[] = this.App.NetworkModule.getNetworkDevicesStatus()
            this.App.sendResponse(res, response, {code: 200, message: "OK"})
        })

        this.router.get('/refresh', (req, res) => {
            this.App.NetworkModule.pingAllDevices()
            this.App.sendResponse(res, undefined, {code: 200, message: "Data refesh in action !"})
        })
    }
}
