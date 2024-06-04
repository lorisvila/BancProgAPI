import {BancConfig, ConfigNetworking, DeviceNetworkParams} from "~/types/types";
import {App} from "~/server";
import {sys} from "ping";

export class NetworkModule {

    mainClass: App
    bancConfiguration: BancConfig | undefined

    constructor(mainClass: App) {
        this.mainClass = mainClass
        this.bancConfiguration = this.mainClass.MainModule.bancConfiguration
        this.pingAllDevices() // Ping les équipements pour la 1e fois
        // Ping les équipements toutes les X sec selon la config
        setInterval(() => {this.pingAllDevices()}, this.mainClass.config.app.pingInterval*1000)
    }

    pingAllDevices() {
        if (this.bancConfiguration) {
            for (let item in this.bancConfiguration.Networking) {
                let deviceCategory: ConfigNetworking = this.bancConfiguration.Networking[item]
                for (let item2 in deviceCategory.addresses) {
                    let device: DeviceNetworkParams = deviceCategory.addresses[item2]
                    sys.probe(device.IP, (isAlive, err) => {
                        //console.log(device.IP, isAlive)
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