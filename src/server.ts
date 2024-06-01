import cors from 'cors';
import fs from 'fs';
import express, {Express, NextFunction, Request, Response} from 'express';
import {ConfigType, ResponseType} from "~/types/types";
import {MainController} from "~/ressources/main.controller";
import {MainModule} from "~/modules/main.module";
import {GpioController} from "~/ressources/gpio.controller";


const CONFIG_FILE_PATH: string = "./config.json"


export class App {

  app: Express = express()
  config: ConfigType
  MainController: MainController
  MainModule: MainModule
  GpioController: GpioController


  constructor() {
    this.app.use(express.json())
    let tmp_config: ConfigType | undefined = this.getConfig()
    if (!tmp_config) {
      process.exit(2)
    }
    this.config = tmp_config
    this.MainController = new MainController(this)
    this.MainModule = new MainModule(this)
    this.GpioController = new GpioController(this)

    this.app.use(cors())

    this.app.use(this.logRequest)
    this.app.use(this.MainController.mainEndpoint, this.MainController.router)
    this.app.use(this.GpioController.mainEndpoint, this.GpioController.router)

    // Fallback 404 if no endpoint found in router above
    this.app.use((req, res, next) => {
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
    res.status(responseObject.status.code )
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
