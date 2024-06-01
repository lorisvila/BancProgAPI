// App Types
export type ConfigType = {
  configs: BancConfig[]
  app: {
    defaultConfig: string
  }
  webserver: {
      port: number,
      host: string
  },
}

export type BancConfig = {
  Name: string
  Networking: ConfigNetworking[]
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