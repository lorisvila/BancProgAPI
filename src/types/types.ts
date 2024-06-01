// App Types
import {BinaryValue, Gpio} from "onoff";

export type ConfigType = {
  app: {
    defaultConfig: string
    defaultState: BinaryValue
    invertOutputLogic: boolean
  }
  webserver: {
      port: number,
      host: string
  }
  configs: BancConfig[]
}

export type BancConfig = {
  Name: string
  Cards: Card[]
  Networking: ConfigNetworking[]
}
export type Card = {
  cardType?: string,
  cardName: string,
  pins: CardPin[]
}
export type CardPin = {
  GPIO: number,
  PinName: string,
  NumberOnCard: string,
  object?: Gpio,
  state?: BinaryValue
}
export type ConfigNetworking = {
  name: string
  quantity: number
  addresses: DeviceNetworkParams[]
}
export type DeviceNetworkParams = {
  IP: string,
  SubnetMask: string
  IsAlive?: boolean
}

export type OnlineDevices = {}

// Requests Types
export type ResponseType = {
  date: number // Time as the 32 bits value of time
  data: any
  status: {
    code: number,
    message?: string
  }
}