import {Request, Response, Router} from "express";
import {App} from "~/server";

export class MainController {

    App: App
    router: Router
    baseEndpoint: string = "/api/v1/"

    constructor(mainClass: App) {
        this.router = Router()
        this.App = mainClass

        this.router.get('/', (req, res) => {
            this.App.sendResponse(res, "The API is running ! It seems like you'd like to get more content ? Go see the docs :)", {code: 200})
        })

        this.router.get('/status', (req: Request, res: Response) => {
            let responseObject = {
                config: this.App.MainModule.bancConfiguration
            }
            this.App.sendResponse(res, responseObject, {code: 200, message: "OK"})
        })

        this.router.get('/getAllConfigs', (req: Request, res: Response) => {
            this.App.sendResponse(res, this.App.config.configs, {code: 200, message: "OK"})
        })

        this.router.get('/getConfig/:configName', (req: Request, res: Response) => {
            let configName = req.params.configName
            let configObject = this.App.config.configs.find((config) => config.Name == configName)
            if (configObject) {
                this.App.sendResponse(res, configObject, {code: 200, message: `${configName} correctly found`})
            } else {
                this.App.sendResponse(res, undefined, {code: 404, message: `${configName} not found...`})
            }
        })

        this.router.get('/getCurrentConfig', (req: Request, res: Response) => {
            this.App.sendResponse(res, this.App.MainModule.bancConfiguration, {code: 200, message: "0K"})
        })

        //TODO : Add a current config + change config url

    }
}
