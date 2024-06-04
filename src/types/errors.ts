export type ErrorNameGPIO = 'PIN_NOT_FOUND' | 'CARD_NOT_FOUND' | 'MODULE_GPIO_NOT_FOUND' | 'ERROR_WRITING_STATE' | 'ERROR_READING_STATE' | 'I2C_BUS_ERROR'

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

export type ErrorNameCommand = 'COMMAND_NOT_FOUND' | '' | '' | '' | '' | ''

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