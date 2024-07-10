import {App} from "~/server";
import WebSocket from "ws";
import {ResponseType, WebSocketRequestType} from "~/types/types";
import {CommandError, GPIOError, RequestError} from "~/types/errors";
import {EventEmitter} from "node:events";

export class WebSocketHandlerController {

    App: App
    wsSendMessageToClientsEvent: EventEmitter = new EventEmitter()

    constructor(mainClass: App) {
        this.App = mainClass

        this.App.wss.on('connection', (ws, request) => {
            console.log(`${new Date().toUTCString()} | ${request.socket.remoteAddress} | Client connected with WebSocket`)

            this.wsSendData(ws, 'errors', this.App.savedErrors, {code: 200, message: 'OK'})

            ws.on('close', () => {
                console.log(`${new Date().toUTCString()} | ${request.socket.remoteAddress} | Client disconnected with WebSocket`)
            })

            ws.on('error', console.error)

            ws.on('message', (data) => {
                let dataObject: undefined | WebSocketRequestType = undefined
                try {
                    dataObject = JSON.parse(data.toString())
                } catch (error) {
                    this.wsSendData(ws, "", undefined,
                        {code: 500, message: "Le format de ta requête n'est même pas en JSON ! Pas bien jeune 😉"})
                    return;
                }
                if (!dataObject || typeof dataObject.commands == undefined || typeof dataObject.refresh == undefined) {
                    this.wsSendData(ws, "", undefined,
                        {code: 500, message: "Il manque des éléments dans ta requête... Pas bien jeune 😉"})
                    return;
                }
                this.handleCommands(ws, dataObject.commands, dataObject.options)
                if (dataObject.refresh) {
                    this.wsSendData(ws, 'refreshedFinsish', undefined)
                }
            })

            this.wsSendMessageToClientsEvent.on('message', (queryName, data) => {
                this.wsSendData(ws, queryName, data)
            })
        })

    }

    handleCommands(ws: WebSocket, commandsList: string[], globalOptions?: {}) {
        for (let queryNameId in commandsList) {
            let queryName: string = commandsList[queryNameId]
            let options: undefined | {} = undefined
            if (globalOptions?.hasOwnProperty(queryName)) {
                options = globalOptions[queryName as keyof typeof globalOptions]
            }
            try {
                this.handleCommand(ws, queryName, options)
            } catch (error) { // Try to handle the command and if it crashes, catch it, if it is a custom error, return a message that there was an error, if not crash...
                if (error instanceof GPIOError || error instanceof CommandError || error instanceof RequestError) {
                    this.wsSendData(ws, queryName, undefined, {code: error.code, message: error.message})
                    this.sendGpioRefreshedData(ws) // TODO : This may loop; because if the called function when refreshing crashes... It will loop forever...
                } else {
                    this.wsSendData(ws, queryName, undefined, {code: 500, message: "Une erreur côté serveur est survenue"})
                }
                return
            }
        }
    }

    handleCommand(ws: WebSocket, queryName: string, options?: {}) {
        switch (queryName) {
            // All the get commands -->
            case "networkDevicesStatus": {
                let data = this.App.NetworkModule.getNetworkDevicesStatus()
                this.wsSendData(ws, queryName, data)
                break;
            }
            case "allConfigs": {
                let data = this.App.config.configs
                this.wsSendData(ws, queryName, data)
                break;
            }
            case "currentConfig": {
                let data = this.App.MainModule.bancConfiguration
                this.wsSendData(ws, queryName, data)
                break;
            }
            case "allCards": {
                let data = this.App.GpioModule.readAllCards()
                this.wsSendData(ws, queryName, data)
                break;
            }
            case "allModules": {
                let data = this.App.GpioModule.getAllModules()
                this.wsSendData(ws, queryName, data)
                break;
            }
            case "bancPinout": {
                let data = this.App.GpioModule.getPinout()
                this.wsSendData(ws, queryName, data)
                break;
            }
            case "allCommands": {
                let data = this.App.CommandsModule.getAllCommands()
                this.wsSendData(ws, queryName, data)
                break;
            }
            case "availableCommands": {
                let data = this.App.CommandsModule.getAvailableCommands()
                this.wsSendData(ws, queryName, data)
                break;
            }
            case "allEtats": {
                let data = this.App.CommandsModule.getAllEtats()
                this.wsSendData(ws, queryName, data)
                break;
            }
            case "updateRegisters": {
                let data = this.App.GpioModule.initialiseObjectsAndRegisters()
                this.wsSendData(ws, queryName, undefined)
                break;
            }
            case "writeToCard": {
                if (!options) {
                    throw new RequestError('OPTIONS_MISSING', 'Il manque les options dans votre requête...', {})
                }
                let numberOnCard: string | undefined = undefined
                let cardNumber: string | undefined = undefined
                let state: string | undefined = undefined
                try {
                    numberOnCard = options['numberOnCard' as keyof typeof options]
                    cardNumber = options['cardName' as keyof typeof options]
                    state = options['state' as keyof typeof options]
                } catch (error) {
                    throw new RequestError('OPTIONS_MISSING', 'Une option manque dans votre requête...')
                }
                this.App.GpioModule.writeValueToGPIO(cardNumber, numberOnCard, state)
                this.sendGpioRefreshedData(ws)
                break;
            }
            case "writeToModule": {
                if (!options) {
                    throw new RequestError('OPTIONS_MISSING', 'Il manque les options dans votre requête...', {})
                }
                let module: string | undefined = undefined
                let pin: string | undefined = undefined
                let state: string | undefined = undefined
                try {
                    module = options['module' as keyof typeof options]
                    pin = options['pin' as keyof typeof options]
                    state = options['state' as keyof typeof options]
                } catch (error) {
                    throw new RequestError('OPTIONS_MISSING', 'Une option manque dans votre requête...')
                }
                this.App.GpioModule.writeToModule(module, pin, state)
                this.sendGpioRefreshedData(ws)
                break;
            }
            case "sendCommand": {
                if (!options) {
                    throw new RequestError('OPTIONS_MISSING', 'Il manque les options dans votre requête...', {})
                }
                let commandName: string | undefined = undefined
                let force: boolean | undefined = undefined
                try {
                    commandName = options['commandName' as keyof typeof options]
                    force = options.hasOwnProperty('force') ? options['force' as keyof typeof options] : false
                } catch (error) {
                    throw new RequestError('OPTIONS_MISSING', 'Une option manque dans votre requête...')
                }
                this.App.CommandsModule.sendCommand(commandName, force)
                this.sendGpioRefreshedData(ws)
                break;
            }
            default: {
                throw new RequestError('COMMAND_NOT_FOUND', `La commande ${queryName} n'a pas été trouvée...`, {code: 404})
            }
        }
    }

    sendGpioRefreshedData(ws: WebSocket) {
        this.handleCommands(ws, ['allEtats', 'availableCommands', 'allModules', 'allCards'])
    }

    wsSendData(ws: WebSocket, dataName: string, data: any, status?: {code: number, message: string}): void {
        let responseObject: ResponseType = {
            date: new Date().getTime(),
            dataName: dataName,
            data: data,
            status: status ? status : {code: 200, message: 'OK'},
        }
        let responseObjectString = JSON.stringify(responseObject)
        ws.send(responseObjectString)
    }

}
