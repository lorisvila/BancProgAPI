import cors from 'cors';
import fs from 'fs';
import express, {Express, NextFunction, Request, Response} from 'express';
import {ConfigType, ErrorInListType, ResponseType} from "~/types/types";
import {MainController} from "~/ressources/main.controller";
import {MainModule} from "~/modules/main.module";
import {GpioController} from "~/ressources/GPIO.controller";
import {GpioModule} from "~/modules/GPIO.module";
import * as process from "node:process";
import {NetworkController} from "~/ressources/network.controller";
import {NetworkModule} from "~/modules/network.module";
import {CommandsController} from "~/ressources/commands.controller";
import {CommandsModule} from "~/modules/commands.module";
import {WebSocketServer} from "ws";
import {WebSocketHandlerController} from "~/ressources/WebSocketHandler.controller";
import {AppLogger} from "./appLogger"
import {Logger} from "pino";

// chmod -R a+x Webstorm_API/node_modules/
// https://nodejs.org/dist/v22.3.0/node-v22.3.0-linux-armv7l.tar.xz

const CONFIG_FILE_PATH: string = "./config.json"

export class App {

  app: Express
  wss: WebSocketServer
  config: ConfigType
  savedErrors: ErrorInListType[] = []

  MainController: MainController
  MainModule: MainModule
  GpioController: GpioController
  GpioModule: GpioModule
  NetworkController: NetworkController
  NetworkModule: NetworkModule
  CommandsController: CommandsController
  CommandsModule: CommandsModule
  WebSocketHandlerController: WebSocketHandlerController

  AppLogger: AppLogger
  logger: Logger

  constructor() {
    let tmp_config: ConfigType | undefined = this.getConfig();
    this.config = tmp_config as ConfigType;
    this.AppLogger = new AppLogger(this.config);
    this.logger = this.AppLogger.getLogger();
    if (!this.config) {
      this.logger.error("La configuration n'a pas été chargée... Arrêt du script !");
      process.exit(2);
    }

    this.logger.info('# Starting the Express API');
    this.app = express();
    this.app.use(express.json());
    this.wss = new WebSocketServer({port: this.config.wss.port, host: this.config.wss.host});

    this.logger.info('# Initialisation des modules');
    this.MainModule = new MainModule(this);
    this.GpioModule = new GpioModule(this);
    this.NetworkModule = new NetworkModule(this);
    this.CommandsModule = new CommandsModule(this);
    this.logger.info('# Initialisation des controlleurs de requêtes HTTP');
    this.MainController = new MainController(this);
    this.GpioController = new GpioController(this);
    this.NetworkController = new NetworkController(this);
    this.CommandsController = new CommandsController(this);
    this.logger.info('# Initialisation du contrôleur WebSocket');
    this.WebSocketHandlerController = new WebSocketHandlerController(this);

    this.app.use(cors());

    this.app.use(this.logRequest)
    this.app.use(this.MainController.baseEndpoint, this.MainController.router);
    this.app.use(this.GpioController.baseEndpoint, this.GpioController.router);
    this.app.use(this.NetworkController.baseEndpoint, this.NetworkController.router);
    this.app.use(this.CommandsController.baseEndpoint, this.CommandsController.router);

    // Fallback 404 if no endpoint found in router above
    this.app.use((req: Request, res: Response) => {
      let endpoint = req.url;
      this.sendResponse(res, {}, {code: 404, message: `Endpoint '${endpoint}' not found...`});
    })

    this.logger.info(`Serving server on ${this.config.webserver.host}:${this.config.webserver.port}`);
    this.app.listen(this.config.webserver.port, this.config.webserver.host);
  }

  logRequest = (req: Request, _res: Response, next: NextFunction)=> {
    let ip = req.ip;
    let endpoint = req.url;
    let date = new Date().toUTCString();
    this.logger.info(`Req : ${date} | ${ip} | ${endpoint}`);
    next();
  }

  sendResponse(res: Response, data: any, status: {code: number, message?: string}): void {
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

  storeError(error: unknown): void {
    let errorObject = error as Error
    let date = new Date()
    this.logger.error('!Error! ' + date.toUTCString() + ' - ' + errorObject.message)
    this.savedErrors = [...this.savedErrors, {date: date, errorObject: errorObject}]
  }

}

new App()
