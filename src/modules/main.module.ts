import {App} from "~/server";
import {BancConfig, ConfigNetworking, DeviceNetworkParams} from "~/types/types";
import {sys} from "ping"

export class MainModule {

    mainClass: App
    bancConfiguration: BancConfig | undefined

    constructor(mainClass: App) {
        this.mainClass = mainClass
        console.log(`Loading the configuration : ${this.mainClass.config.app.defaultConfig}`)
        this.importConfigBanc()
        this.pingAllDevices()
    }

    importConfigBanc() {
        this.bancConfiguration = this.mainClass.config.configs.find((config) => config.Name == this.mainClass.config.app.defaultConfig)
        if (!this.bancConfiguration) {
            throw Error(`La configuration ${this.mainClass.config.app.defaultConfig} n'a pas été trouvée...`)
        }
    }

    pingAllDevices() {
        if (this.bancConfiguration) {
            for (let item in this.bancConfiguration.Networking) {
                let deviceCategory: ConfigNetworking = this.bancConfiguration.Networking[item]
                for (let item2 in deviceCategory.addresses) {
                    let device: DeviceNetworkParams = deviceCategory.addresses[item2]
                    sys.probe(device.IP, (isAlive, err) => {
                        console.log(device.IP, isAlive)
                        if (isAlive == null) {isAlive = false}
                        if (this.bancConfiguration) {
                            this.bancConfiguration.Networking[item].addresses[item2].IsAlive = isAlive
                        }
                    })
                }
            }
        }
    }

}