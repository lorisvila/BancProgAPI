import {App} from "~/server";
import WebSocket from "ws";
import {ResponseType, WebSocketRequestType} from "~/types/types";
import {CommandError, GPIOError, NetworkError, RequestError} from "~/types/errors";
import {EventEmitter} from "node:events";
import {Logger} from "pino";

export class WebSocketHandlerController {

    mainClass: App
    wsSendMessageToClientsEvent$: EventEmitter = new EventEmitter() // Args : ('message', queryName, data, status?)

    logger: Logger

    constructor(mainClass: App) {
        this.mainClass = mainClass
        this.logger = this.mainClass.AppLogger.createChildLogger(this.constructor.name)
        this.logger.info(`Initializing class ${this.constructor.name}`)

        this.mainClass.wss.on('connection', (ws, request) => {
            this.logger.info(`${new Date().toUTCString()} | ${request.socket.remoteAddress} | Client connected with WebSocket`)

            this.wsSendData(ws, 'errors', this.mainClass.savedErrors, {code: 200, message: 'OK'})

            ws.on('close', () => {
                this.logger.info(`${new Date().toUTCString()} | ${request.socket.remoteAddress} | Client disconnected with WebSocket`)
            })

            ws.on('error', (err) => {
                this.logger.error(err.message + ' | ' + err.message)
            })

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
                this.logger.debug(`${new Date().toUTCString()} | ${request.socket.remoteAddress} | Client request(s) ${dataObject.commands} | Refresh : ${dataObject.refresh} | Options : ${JSON.stringify(dataObject.options)}`)
                this.handleCommands(dataObject.commands, dataObject.options)
                if (dataObject.refresh) {
                    this.wsSendData(ws, 'refreshedFinsish', undefined)
                }
            })

            this.wsSendMessageToClientsEvent$.on('message', (queryName, data, status?) => {
                this.wsSendData(ws, queryName, data, status)
            })
        })

    }

    handleCommands(commandsList: string[], globalOptions?: {}) {
        for (let queryNameId in commandsList) {
            let queryName: string = commandsList[queryNameId]
            let options: undefined | {} = undefined
            if (globalOptions?.hasOwnProperty(queryName)) {
                options = globalOptions[queryName as keyof typeof globalOptions]
            }
            try {
                this.handleCommand(queryName, options)
            } catch (error) { // Try to handle the command and if it crashes, catch it, if it is a custom error, return a message that there was an error, if not crash...
                if (error instanceof GPIOError || error instanceof CommandError || error instanceof RequestError || error instanceof NetworkError) {
                    this.logger.error(`Client had a error : ${error.code} | ${error.name} | ${error.message}`)
                    this.wsSendMessageToClientsEvent$.emit(queryName, undefined, {code: error.code, message: error.message})
                    this.sendGpioRefreshedData() // TODO : This may loop; because if the called function when refreshing crashes... It will loop forever...
                } else {
                    this.logger.error(`Client had a error : 500 | INTERN_ERROR | ${(error as Error).message}`)
                    this.wsSendMessageToClientsEvent$.emit(queryName, undefined, {code: 500, message: "Une erreur côté serveur est survenue"})
                }
                return
            }
        }
    }

    handleCommand(queryName: string, options?: {}) {
        this.logger.debug(`Handling command ${queryName} with options : ${JSON.stringify(options)}`)
        switch (queryName) {
            // All the get commands -->
            case "networkDevicesStatus": {
                let data = this.mainClass.NetworkModule.getNetworkDevicesStatus()
                this.wsSendMessageToClientsEvent$.emit('message', queryName, data)
                break;
            }
            case "allConfigs": {
                let data = this.mainClass.config.configs
                this.wsSendMessageToClientsEvent$.emit('message', queryName, data)
                break;
            }
            case "currentConfig": {
                let data = this.mainClass.MainModule.bancConfiguration
                this.wsSendMessageToClientsEvent$.emit('message', queryName, data)
                break;
            }
            case "allCards": {
                let data = this.mainClass.GpioModule.readAllCards()
                this.wsSendMessageToClientsEvent$.emit('message', queryName, data)
                break;
            }
            case "allModules": {
                let data = this.mainClass.GpioModule.getAllModules()
                this.wsSendMessageToClientsEvent$.emit('message', queryName, data)
                break;
            }
            case "bancPinout": {
                let data = this.mainClass.GpioModule.getPinout()
                this.wsSendMessageToClientsEvent$.emit('message', queryName, data)
                break;
            }
            case "allCommands": {
                let data = this.mainClass.CommandsModule.getAllCommands()
                this.wsSendMessageToClientsEvent$.emit('message', queryName, data)
                break;
            }
            case "availableCommands": {
                let data = this.mainClass.CommandsModule.getAvailableCommands()
                this.wsSendMessageToClientsEvent$.emit('message', queryName, data)
                break;
            }
            case "allEtats": {
                let data = this.mainClass.CommandsModule.getAllEtats()
                this.wsSendMessageToClientsEvent$.emit('message', queryName, data)
                break;
            }
            case "updateRegisters": {
                this.mainClass.GpioModule.setupModules()
                this.mainClass.GpioModule.initialiseObjectsAndRegisters()
                this.wsSendMessageToClientsEvent$.emit('message', queryName, undefined)
                break;
            }
            case "getSwitchData": {
                let data = this.mainClass.NetworkModule.getAllSwitchData()
                this.wsSendMessageToClientsEvent$.emit('message', queryName, data)
                break;
            }
            // All the post commands -->
            case "changeConfiguration": {
                if (!options) {
                    throw new RequestError('OPTIONS_MISSING', 'Il manque les options dans votre requête...', {})
                }
                let configurationName: string | undefined = undefined
                try {
                    configurationName = options['configurationName' as keyof typeof options]
                } catch (error) {
                    throw new RequestError('OPTIONS_MISSING', 'Une option manque dans votre requête...')
                }
                this.mainClass.MainModule.importConfigBanc(configurationName)
                this.sendAllRefreshedData()
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
                this.mainClass.GpioModule.writeValueToGPIO(cardNumber, numberOnCard, state)
                this.sendGpioRefreshedData()
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
                this.mainClass.GpioModule.writeToModule(module, pin, state)
                this.sendGpioRefreshedData()
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
                this.mainClass.CommandsModule.sendCommand(commandName, force)
                this.sendGpioRefreshedData()
                break;
            }
            case "sendSwitchArchitecture": {
                if (!options) {
                    throw new RequestError('OPTIONS_MISSING', 'Il manque les options dans votre requête...', {})
                }
                let architecture: string | undefined = undefined
                try {
                    architecture = options['architecture' as keyof typeof options]
                } catch (error) {
                    throw new RequestError('OPTIONS_MISSING', 'Une option manque dans votre requête...')
                }
                this.mainClass.NetworkModule.changeSwitchArchitecture(architecture)
                break;
            }
            default: {
                throw new RequestError('COMMAND_NOT_FOUND', `La commande ${queryName} n'a pas été trouvée...`, {code: 404})
            }
        }
    }

    sendAllRefreshedData() {
        this.handleCommands(['networkDevicesStatus', 'allConfigs', 'currentConfig', 'allCards', 'allModules', 'bancPinout', 'availableCommands', 'allEtats', 'getSwitchData'])
    }

    sendGpioRefreshedData() {
        this.handleCommands(['allEtats', 'availableCommands', 'allModules', 'allCards', 'getSwitchData'])
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
