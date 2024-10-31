export type ErrorNameGPIO =
    'PIN_NOT_FOUND' |
    'CARD_NOT_FOUND' |
    'MODULE_GPIO_NOT_FOUND' |
    'ERROR_WRITING_STATE' |
    'ERROR_READING_STATE' |
    'I2C_BUS_ERROR' |
    'GPIO_MODULE_DISABLED' |
    'PIN_OR_MODULE_GPIO_NOT_FOUND'

export class GPIOError extends Error {
    name: ErrorNameGPIO;
    message: string;
    cause: any;
    code: number;

    constructor(name: ErrorNameGPIO, message: string, args?: {code?: number, cause?: any}) {
        super();
        this.name = name;
        this.message = message;
        this.cause = args?.cause;
        this.code = args?.code ? args.code : 500; // By default it is a error 500
    }
}

export type ErrorNameRequest =
    'OPTIONS_MISSING' |
    'COMMAND_NOT_FOUND'

export class RequestError extends Error {
    name: ErrorNameRequest;
    message: string;
    cause: any;
    code: number;

    constructor(name: ErrorNameRequest, message: string, args?: {code?: number, cause?: any}) {
        super();
        this.name = name;
        this.message = message;
        this.cause = args?.cause;
        this.code = args?.code ? args.code : 500; // By default it is a error 500
    }
}


export type ErrorNameCommand =
    'COMMAND_NOT_FOUND' |
    'ETAT_NOT_FOUND' |
    'COMMAND_FORBIDDEN'

export class CommandError extends Error {
    name: ErrorNameCommand;
    message: string;
    cause: any;
    code: number;

    constructor(name: ErrorNameCommand, message: string, args?: {code?: number, cause?: any}) {
        super();
        this.name = name;
        this.message = message;
        this.cause = args?.cause;
        this.code = args?.code ? args.code : 500; // By default it is a error 500
    }
}


export type ErrorNameNetwork =
    'NO_CONFIGURATION' |
    'NO_SERVICE_FOUND' |
    'NO_DEVICE_FOUND' |
    'PY_API_ERROR' |
    'NO_CARD_FOUND'

export class NetworkError extends Error {
    name: ErrorNameNetwork;
    message: string;
    cause: any;
    code: number;

    constructor(name: ErrorNameNetwork, message: string, args?: {code?: number, cause?: any}) {
        super();
        this.name = name;
        this.message = message;
        this.cause = args?.cause;
        this.code = args?.code ? args.code : 500; // By default it is a error 500
    }
}
