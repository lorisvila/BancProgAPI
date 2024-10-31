import {
    ArchitecturePortType,
    ArchitectureType,
    ConfigNetworking,
    DeviceNetworkParams,
    MESD,
    SwitchConfigType,
    SwitchPortType
} from "~/types/types";
import {App} from "~/server";
import {sys} from "ping";
import {Telnet} from "telnet-client";
import * as console from "node:console";
import {NetworkError} from "~/types/errors";
import * as net from "node:net";
import {Logger} from "pino";

export class NetworkModule {

    mainClass: App
    MESD_Connections: Map<string, MESD> = new Map<string, MESD>

    logger: Logger

    constructor(mainClass: App) {
        this.mainClass = mainClass
        this.logger = this.mainClass.AppLogger.createChildLogger(this.constructor.name)
        this.logger.info(`Initializing class ${this.constructor.name}`)

        this.setupSwitchConfig()

        this.pingAllDevices() // Ping les équipements pour la 1e fois
        // Ping les équipements toutes les X sec selon la config
        setInterval(() => {this.pingAllDevices()}, this.mainClass.config.app.pingInterval*1000)

        // this.connectToMESD2('BRIO_1', '10.127.4.10', 2000, '*BRIO_99digi') TODO : Remove this line and use the connectAllMESD function of this class
    }

    get switchConfig(): SwitchConfigType | undefined {
        return this.mainClass.MainModule.bancConfiguration?.Switch
    }

    pingAllDevices() {
        this.mainClass.MainModule.bancConfiguration?.Networking.forEach((deviceCategory: ConfigNetworking) => {
            deviceCategory.addresses.forEach((device: DeviceNetworkParams) => {
                sys.probe(device.IP, (isAlive, _err) => {
                    if (isAlive == null) {isAlive = false}
                    if (this.mainClass.MainModule.bancConfiguration) {
                        device.IsAlive = isAlive
                    }
                })
            })
        })
    }

    getNetworkDevicesStatus(): ConfigNetworking[] {
        if (!this.mainClass.MainModule.bancConfiguration) {
            throw new NetworkError('NO_CONFIGURATION', 'Trying to get the network devices status without a bancConfiguration', {code: 500});
        }
        return this.mainClass.MainModule.bancConfiguration?.Networking as ConfigNetworking[]
    }

    connectToAllMESD() {
        this.mainClass.MainModule.bancConfiguration?.Cards.forEach(card => {
            let foundCard = this.mainClass.MainModule.bancConfiguration?.Networking.find(deviceGroup => deviceGroup.name.startsWith('MESD'))?.addresses.find(device => device.name == card.cardName)
            if (!foundCard) {
                throw new NetworkError('NO_CARD_FOUND', `Aucune carte réseau MESD ${card.cardName} trouvée pour le telnet dans la config...`)
            }
            let telnetService = foundCard.services.find(service => service.protocol == 'telnet')
            if (!telnetService) {
                throw new NetworkError('NO_CARD_FOUND', `Aucun service telnet sur la MESD ${card.cardName} trouvé dans la config...`)
            }
            if (!telnetService.port || !telnetService.password) {
                throw new NetworkError('NO_CARD_FOUND', `Aucun port ET OU mot de passe telnet précisé pour la MESD ${card.cardName} dans la config...`)
            }
            this.connectToMESD(card.cardName, telnetService.url, telnetService.port, telnetService.password)
        })
    }

    async connectToMESD2(cardName: string, ipAdress: string, portNumber: number, password: string): Promise<void> {
        const client = new net.Socket()
        client.connect(2000, "10.127.1.10", () => {
            client.write('*BRIO_99digi\r\n');
            client.write('*BRIO_99digi\r\n');
            client.write('*BRIO_99digi\r\n');
            client.write('*BRIO_99digi\r\n');
        })

        client.on('data', (data) => {
            const response = data.toString();
            console.log('Received:', response);
        });

        client.write('lsen\r\n')
    }

    async connectToMESD(cardName: string, ipAdress: string, portNumber: number, password: string): Promise<void> {

        let MESD_Class = new MESD(new Telnet(), cardName)
        this.MESD_Connections.set(cardName, MESD_Class)

        console.log(`Connecting to MESD ${cardName} at ${ipAdress}:${portNumber}`);
        const params = {
            host: ipAdress,
            port: portNumber,
            timeout: 1500,
            shellPrompt: null,
            negotiationMandatory: false,
        };

        await MESD_Class.Client.connect(params); // TODO : Make the error of timeout added to the error array list...
        console.log(`Connected to MESD ${cardName}`)

        await MESD_Class.Client.write(Buffer.from(`*BRIO_99digi\r\n`, 'utf-8'));

        MESD_Class.Client.on('data', (data) => {
            console.log(data.toString())
            MESD_Class.dataBuffer += data.toString('utf8');
            this.MESDprocessData(MESD_Class.dataBuffer, MESD_Class)
        })

        await MESD_Class.Client.write('lsen\r\n');

    }

    MESDprocessData(data: string, MESD_Class: MESD) {
        const lines = data.split('\n');

        const startIndex = lines.findIndex(line => line.includes('Etat des entrees:'));

        if (startIndex === -1) {return;} // Si pas de données entrées disponibles...

        const endIndex = startIndex + 5; // 1 pour "Etat des entrees:" + 4 lignes suivantes
        const relevantLines = lines.slice(startIndex + 3, endIndex);

        if (relevantLines.length < 2 || relevantLines.includes('')) {return;} // On a pas encore reçu toutes les lignes

        MESD_Class.inputStates = relevantLines
        MESD_Class.dataBuffer = ''
        console.log(MESD_Class.inputStates, MESD_Class.cardName)
    }

    // ############################
    // Switch Section
    // ############################

    getAllSwitchData() {
        return this.switchConfig
    }

    setupSwitchConfig() {
        this.switchConfig?.ports.forEach((port): void => {
            if (!port.config) {
                port.config = this.switchConfig?.defaultConfig
            }
        })
        if (this.switchConfig) {
            this.switchConfig.connection = false
        }
    }

    changeSwitchArchitecture(architecture: ArchitectureType): void {
        let bancConfiguration = this.mainClass.MainModule.bancConfiguration
        if (!bancConfiguration) {
            throw new NetworkError('NO_CONFIGURATION', "La configuration du banc n'a pas été trouvée...")
        }
        bancConfiguration.Switch.currentArchitecture = architecture
        bancConfiguration.Switch.ports.forEach((port): void => {
            this.resetPortSettings(port)
        })
        bancConfiguration.Switch.currentArchitecture.ports.forEach((portDevice: ArchitecturePortType) => {
            this.changePortSettings(portDevice)
        })
        this.mainClass.WebSocketHandlerController.wsSendMessageToClientsEvent$.emit('message', 'getSwitchData', bancConfiguration.Switch) // TODO : A déplacer quand
    }

    resetPortSettings(port: SwitchPortType): void {
        let bancConfiguration = this.mainClass.MainModule.bancConfiguration
        if (!bancConfiguration) {
            throw new NetworkError('NO_CONFIGURATION', "La configuration du banc n'a pas été trouvée...")
        }
        if (!port.configurable) {
            return
        }
        port.device = undefined
        port.config = bancConfiguration?.Switch.defaultConfig
    }

    changePortSettings(portDevice: ArchitecturePortType) {
        let bancConfiguration = this.mainClass.MainModule.bancConfiguration
        if (!bancConfiguration) {
            throw new NetworkError('NO_CONFIGURATION', "La configuration du banc n'a pas été trouvée...")
        }
        let deviceObject = bancConfiguration?.Networking.find((deviceGroup) => deviceGroup.addresses.find((device) => device.name == portDevice.device))?.addresses.find((device) => device.name == portDevice.device)
        if (!deviceObject) {
            throw new NetworkError('NO_DEVICE_FOUND', `Le device ${portDevice.device} n'a pas été trouvé dans la config actuelle...`)
        }
        let portObject = bancConfiguration?.Switch.ports.find((port) => port.port == portDevice.port)
        if (!portObject) {
            throw new NetworkError('NO_DEVICE_FOUND', `Le port ${portDevice.port} n'a pas été trouvé dans la config actuelle...`)
        }
        // Set the device network parameters
        portObject.device = deviceObject.name
        this.mainClass.MainModule.addInstructionToRedis('pyNetworkingAPI', {
            instructionName: "configurePort",
            instructionData: {portObject: portObject}
        })
    }

}
