import {Request, Response, Router} from "express";
import {App} from "~/server";

export class MainController {

    App: App
    router: Router
    mainEndpoint: string = "/api/v1/"

    constructor(mainClass: App) {
        this.router = Router()
        this.App = mainClass

        this.router.get('/', (req, res) => {
            this.App.sendResponse(res, "The API is running ! It seems like you'd like to get more content ? Go see the docs :)", {code: 200})
        })

        this.router.get('/configs', (req: Request, res: Response) => {
            this.App.sendResponse(res, this.App.config.configs, {code: 200, message: "OK"})
        })

        this.router.get('/configsNameList', (req: Request, res: Response) => {
            let names: string[] = []
            this.App.config.configs.forEach((config) => names.push(config.Name))
            if (names.length != 0) {
                this.App.sendResponse(res, names, {code: 200, message: "OK"})
            } else {
                this.App.sendResponse(res, undefined, {code: 500, message: `Une erreur est survenue dans la config...`})
            }
        })

        this.router.get('/config/:configName', (req: Request, res: Response) => {
            let configName = req.params.configName
            let configObject = this.App.config.configs.find((config) => config.Name == configName)
            if (configObject) {
                this.App.sendResponse(res, configObject, {code: 200, message: `${configName} correctly found`})
            } else {
                this.App.sendResponse(res, undefined, {code: 404, message: `${configName} not found...`})
            }
        })
    }
}
