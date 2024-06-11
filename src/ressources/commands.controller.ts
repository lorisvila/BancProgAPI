import {App} from "~/server";
import {Request, Response, Router} from "express";
import {CommandError} from "~/types/errors";
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
                this.handleError(res, error)
            }
        })

        this.router.get('/getAvailableCommands', (req: Request, res: Response) => {
            try {
                let response = this.App.CommandsModule.getAvailableCommands()
                this.App.sendResponse(res, response, {code: 200, message: "OK"})
            } catch (error) {
                this.handleError(res, error)
            }
        })

        this.router.get('/sendCommand/:command', (req: Request, res: Response) => {
            let command = req.params.command;
            if (command == "") {
                this.App.sendResponse(res, undefined, {code: 400, message: "Bad request..."})
                return;
            }
            let forceSendString = req.query['force']
            let forceSend = false
            if (forceSendString) {
                forceSend = true
            }
            try {
                let response = this.App.CommandsModule.sendCommand(command, forceSend)
                this.App.sendResponse(res, response, {code: 200, message: "OK"})
            } catch (error) {
                this.handleError(res, error)
            }
        })

        this.router.get('/getAllEtats', (req: Request, res: Response) => {
            try {
                let response: Etat[] = this.App.CommandsModule.getAllEtats()
                this.App.sendResponse(res, response, {code: 200, message: "OK"})
            } catch (error) {
                this.handleError(res, error)
            }
        })

        this.router.get('/getEtat/:etat', (req: Request, res: Response) => {
            let etat = req.params.etat;
            if (etat == "") {
                this.App.sendResponse(res, undefined, {code: 400, message: "Bad request..."})
                return;
            }
            try {
                let response: Etat = this.App.CommandsModule.getEtat(etat)
                this.App.sendResponse(res, response, {code: 200, message: "OK"})
            } catch (error) {
                this.handleError(res, error)
            }
        })

        this.router.get('/refreshEtats', (req: Request, res: Response) => {
            try {
                this.App.CommandsModule.refreshEtats()
                this.App.sendResponse(res, undefined, {code: 200, message: "OK"})
            } catch (error) {
                this.handleError(res, error)
            }
        })
    }

    handleError(res: Response, error: unknown): void {
        if (error instanceof CommandError) {
            this.App.sendResponse(res, undefined, {code: error.code, message: error.message})
            return;
        } else {
            throw error;
        }
    }

}