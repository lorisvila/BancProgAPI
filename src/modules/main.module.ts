import {App} from "~/server";
import {BancConfig, ConfigNetworking, DeviceNetworkParams} from "~/types/types";

export class MainModule {

    mainClass: App
    bancConfiguration: BancConfig | undefined

    constructor(mainClass: App) {
        this.mainClass = mainClass
        this.importConfigBanc()
    }

importConfigBanc() {
    console.log(`Loading the configuration : ${this.mainClass.config.app.defaultConfig}`)
    this.bancConfiguration = this.mainClass.config.configs.find((config) => config.Name == this.mainClass.config.app.defaultConfig)
        if (!this.bancConfiguration) {
            throw Error(`La configuration ${this.mainClass.config.app.defaultConfig} n'a pas été trouvée...`)
        }
    }

}