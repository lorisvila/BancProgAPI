// Global config side

import {Telnet} from "telnet-client";

export type ConfigType = {
  logging: {
    GLOBAL_LOG_LEVEL: string
    FILE_LOG_LEVEL: string
    CONSOLE_LOG_LEVEL: string
  }
  app: {
    defaultConfig: string
    pingInterval: number
    refreshMESDdata: number
  }
  redis: {
    host: string
    port: number
    password: string
    selfRedisName: string
    reconnectTimeout: number
  }
  webserver: {
      port: number
      host: string
  }
  wss: {
    port: number
    host: string
  }
  configs: BancConfig[]
  gpio: {
    defaultState: boolean,
    enableRaspiGPIO: boolean
    modules: GPIOModule[]
    pinout: Pinout[]
  }
}

export type BancConfig = {
  Switch: SwitchConfigType
  Name: string
  Cards: Card[]
  Etats: Etat[]
  Commandes: Commande[]
  Networking: ConfigNetworking[]
}

// GPIO Config Side

export type Card = {
  cardType?: string
  cardName: string
  pins: CardPin[]
}
export type CardPin = {
  GPIO: {
    Module:  number
    Pin: number
  },
  PinName: string,
  NumberOnCard: string,
  state?: boolean
}
export type GPIOModule = {
  defaultState: number,
  API_Address: number,
  I2C_Address_HEX: string // HEX value "0x2F" stored as a string --> so you need to parseInt,
  registers: number[] // 2 8bit HEX register stored
}
export type Pinout = {
  pins: number[]
  GPIO_register_address_HEX: string // HEX value "0x2F" stored as a string --> so you need to parseInt
  IODIR_register_address_HEX: string // HEX value "0x2F" stored as a string --> so you need to parseInt
  register_number: number
}

// Scripting Side

export type Etat = {
  category: string
  actualCode: number
  actualState?: EtatState
  states: EtatState[]
}
export type EtatState = {
  name: string
  code: number
  outputs: OutputCommandOrState[]
}
export type OutputCommandOrState = {
  NumberOnCard: string
  state: false
  cards: string[]
}

export type Commande = {
  Name: string
  shortName: string
  cardType: string
  conditions: CommandeCondition[][]
  outputs: OutputCommandOrState[]
}
export type CommandeCondition = {
  category: string
  code: number
}

// Network Config side

export type ConfigNetworking = {
  name: string
  def: string
  family: string
  quantity: number
  addresses: DeviceNetworkParams[]
}
export type DeviceNetworkParams = {
  name: string
  IP: string,
  SubnetMask: string
  IsAlive?: boolean
  services: ServiceType[]
}
export type ServiceType = {
  name: string
  protocol: string
  url: string
  port?: number
  user?: string
  password?: string
}
export class MESD {
  Client: Telnet
  dataBuffer: string = ''
  inputStates: string[] = []
  cardName: string

  constructor(client: Telnet, cardName: string) {
    this.Client = client
    this.cardName = cardName
  }

}

// Switch ports types
export type SwitchConfigType = {
  type: string
  connection: boolean
  display: string[][]
  defaultConfig: PortConfigType
  ports: SwitchPortType[]
  architectures: ArchitectureType[]
  currentArchitecture: ArchitectureType
}
export type SwitchPortType = {
  port: string
  portNum: string
  link: boolean
  configurable: boolean
  description: {
    PoE: boolean
    speed: string
  }
  device?: string
  config?: PortConfigType
}
export type PortConfigType = {
  ip: string
  subnetMask: string
  gateway: string
  dns: string
  ntp: string
  hostname: string
}
export type ArchitectureType = {
  name: string
  ports: ArchitecturePortType[]
}
export type ArchitecturePortType = {
  device: string
  port: string
}

// Requests Types
export type WebSocketRequestType = {
  refresh: boolean
  commands: string[]
  options?: {}
}
export type ResponseType = {
  date: number // Time as the 32 bits value of time
  data: any
  dataName?: string // Used for WebSockets
  status: {
    code: number,
    message?: string
  }
}

// Redis Types
export type RedisInstructionType = {
  instructionName: string
  instructionData: any
}

// Errors list
export type ErrorInListType = {
  date: Date
  errorObject: Error
}
