import cors from 'cors';
import fs from 'fs';
import express, {Express, NextFunction, Request, Response} from 'express';
import {ConfigType, ResponseType} from "~/types/types";
import {MainController} from "~/ressources/main.controller";
import {MainModule} from "~/modules/main.module";
import {GpioController} from "~/ressources/GPIO.controller";
import {GpioModule} from "~/modules/GPIO.module";
import * as process from "node:process";
import {NetworkController} from "~/ressources/network.controller";
import {NetworkModule} from "~/modules/network.module";
import {CommandsController} from "~/ressources/commands.controller";
import {CommandsModule} from "~/modules/commands.module";


const CONFIG_FILE_PATH: string = "./config.json"

export class App {

  app: Express = express()
  config: ConfigType
  MainController: MainController
  MainModule: MainModule
  GpioController: GpioController
  GpioModule: GpioModule
  NetworkController: NetworkController
  NetworkModule: NetworkModule
  CommandsController: CommandsController
  CommandsModule: CommandsModule

  constructor() {
    this.app.use(express.json())
    let tmp_config: ConfigType | undefined = this.getConfig()
    if (!tmp_config) {
      process.exit(2)
    }
    this.config = tmp_config
    this.MainModule = new MainModule(this)
    this.GpioModule = new GpioModule(this)
    this.NetworkModule = new NetworkModule(this)
    this.CommandsModule = new CommandsModule(this)
    this.MainController = new MainController(this)
    this.GpioController = new GpioController(this)
    this.NetworkController = new NetworkController(this)
    this.CommandsController = new CommandsController(this)

    this.app.use(cors())

    this.app.use(this.logRequest)
    this.app.use(this.MainController.baseEndpoint, this.MainController.router)
    this.app.use(this.GpioController.baseEndpoint, this.GpioController.router)
    this.app.use(this.NetworkController.baseEndpoint, this.NetworkController.router)
    this.app.use(this.CommandsController.baseEndpoint, this.CommandsController.router)

    // Fallback 404 if no endpoint found in router above
    this.app.use((req: Request, res: Response) => {
      let endpoint = req.url
      this.sendResponse(res, {}, {code: 404, message: `Endpoint '${endpoint}' not found...`})
    })

    console.log(`Serving server on ${this.config.webserver.host}:${this.config.webserver.port}`)
    this.app.listen(this.config.webserver.port, this.config.webserver.host)
  }

  logRequest(req: Request, res: Response, next: NextFunction) {
    let ip = req.ip
    let endpoint = req.url
    let date = new Date().toUTCString()
    console.log(`${date} | ${ip} | ${endpoint}`)
    next()
  }

  sendResponse(res: Response, data: any, status: {code: number, message?: string}) {
    let responseObject: ResponseType = {
      date: new Date().getTime(),
      data: data,
      status: status,
    }
    res.status(responseObject.status.code)
    res.json(responseObject)
  }

  getConfig(): ConfigType | undefined {
    try {
      let config = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8')
      let configJSON = JSON.parse(config)
      return configJSON as ConfigType
    } catch {
      return undefined
    }
  }

  writeConfig() {
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(this.config, null, 4))
  }

}

const server: App = new App()
