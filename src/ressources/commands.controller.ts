import {App} from "~/server";
import {Request, Response, Router} from "express";
import {CommandError, GPIOError} from "~/types/errors";
import {Etat} from "~/types/types";

export class CommandsController {

    App: App
    router: Router
    baseEndpoint: string = "/api/v1/commands"

    constructor(mainClass: App) {
        this.router = Router()
        this.App = mainClass

        this.router.get('/getAllCommands', (req: Request, res: Response) => {
            try {
                let response = this.App.CommandsModule.getAllCommands()
                this.App.sendResponse(res, response, {code: 200, message: "OK"})
            } catch (error) {
                if (error instanceof CommandError) {
                    this.App.sendResponse(res, undefined, {code: error.code, message: error.message})
                    return;
                } else {
                    throw error;
                }
            }
        })

        this.router.get('/getAvailableCommands', (req: Request, res: Response) => {
            try {
                // TODO : Add the request
                this.App.sendResponse(res, undefined, {code: 200, message: "OK"})
            } catch (error) {
                if (error instanceof CommandError) {
                    this.App.sendResponse(res, undefined, {code: error.code, message: error.message})
                    return;
                } else {
                    throw error;
                }
            }
        })

        this.router.get('/getEtats', (req: Request, res: Response) => {
            try {
                let response: Etat[] = this.App.CommandsModule.getEtats()
                this.App.sendResponse(res, response, {code: 200, message: "OK"})
            } catch (error) {
                if (error instanceof CommandError) {
                    this.App.sendResponse(res, undefined, {code: error.code, message: error.message})
                    return;
                } else {
                    throw error;
                }
            }
        })

    }

}