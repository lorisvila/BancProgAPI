import {App} from "~/server";
import {I2C} from 'raspi-i2c';
import {GPIOError} from "~/types/errors";
import {Card, CardPin, GPIOModule, Pinout} from "~/types/types";
import {EventEmitter} from "node:events";
import {Logger} from "pino";
import * as os from "node:os";

// https://www.npmjs.com/package/raspi-i2c

export function hexStringToNumber(hexStringified: string) {
    return parseInt(hexStringified, 16);
}

export class GpioModule {

    mainClass: App
    i2c: I2C | undefined
    modulesBanc: GPIOModule[]
    i2cEvent: EventEmitter = new EventEmitter()

    logger: Logger

    constructor(mainClass: App) {
        this.mainClass = mainClass
        this.logger = this.mainClass.AppLogger.createChildLogger(this.constructor.name)
        this.logger.info(`Initializing class ${this.constructor.name}`)
        this.modulesBanc = this.mainClass.config.gpio.modules
        try {
            this.setupI2C()
        } catch (error) {
            this.mainClass.storeError(error)
        }
        this.i2cEvent.on('i2cSetupFinished', () => {
            try {
                this.setupModules()
            } catch (error) {
                this.mainClass.storeError(error)
            }
            try {
                this.initialiseObjectsAndRegisters()
            } catch (error) {
                this.mainClass.storeError(error)
            }
        })
    }

    // ----------------------------------------
    // I2C Bus functions

    async setupI2C() {
        if (this.mainClass.config.gpio.enableRaspiGPIO) {

            /*
            "raspi": "^6.0.1",
            "raspi-i2c": "^6.2.4"
            */

            try {
                if (this.mainClass.config.gpio.enableRaspiGPIO && os.platform() === "linux" && os.arch() === "arm") {
                    const { init } = await import('raspi');
                    const { I2C } = await import('raspi-i2c');
                    init(() => {
                        this.i2c = new I2C()
                        this.i2cEvent.emit('i2cSetupFinished')
                        this.logger.debug('Initialization of the Raspi I2C gateway successful')
                    });
                }
            } catch (e) {
                throw new GPIOError('I2C_BUS_ERROR', "Erreur lors de l'ouverture du bus I2C")
            }
        } else {
            this.mainClass.storeError(new GPIOError('GPIO_MODULE_DISABLED', 'Le module I2C RaspsberryPi est désactivé depuis la config !'));
        }
    }

    setupModules() {
        for (let moduleId in this.modulesBanc) {
            let module = this.modulesBanc[moduleId];
            try {
                for (let sideId in this.mainClass.config.gpio.pinout) {
                    let side = this.mainClass.config.gpio.pinout[sideId]
                    if (this.i2c && this.mainClass.config.gpio.enableRaspiGPIO) {
                        // DEBUGGING - console.log(module.I2C_Address_HEX, side.register_number, module.registers, side.GPIO_register_address_HEX, side.IODIR_register_address_HEX)
                        this.i2c.writeSync(hexStringToNumber(module.I2C_Address_HEX),
                            hexStringToNumber(side.IODIR_register_address_HEX),
                            Buffer.from([0x00]))
                        this.i2c.writeSync(hexStringToNumber(module.I2C_Address_HEX),
                            hexStringToNumber(side.GPIO_register_address_HEX),
                            Buffer.from([module.registers[side.register_number]]))
                    }
                }
            } catch (error) {
                this.mainClass.storeError(new GPIOError('I2C_BUS_ERROR', `Le module 0x${module.I2C_Address_HEX} n'a pas réussi à être initialisé...`, {code: 500}))
            }
        }
        this.logger.debug('All GPIO modules are initialized')
    }

    sendWriteCommand(moduleAddress: number, registerAdress: number, registerValue: number) {
        try {
            if (this.i2c && this.mainClass.config.gpio.enableRaspiGPIO) {
                this.i2c.writeSync(moduleAddress, registerAdress, Buffer.from([registerValue]))
            }
        } catch (error) {
            throw new GPIOError('I2C_BUS_ERROR', `La demande d'écriture de pin sur le bus I2C a échoué sur le module 0x${moduleAddress.toString(16)}`, {code: 500})
        }
    }

    // ----------------------------------------
    // Check functions

    checkAndGetCard(cardName: string): Card {
        let card : Card | undefined = this.mainClass.MainModule.bancConfiguration?.Cards.find(card => card.cardName == cardName)
        if (!card) {
            throw new GPIOError('CARD_NOT_FOUND', "La carte que vous avez renseigné n'est pas valide...", {code: 404})
        }
        return card
    }

    checkAndGetPin(cardName: Card, numberOnCard: string): CardPin {
        let pin: CardPin | undefined = cardName.pins.find(pin => pin.NumberOnCard == numberOnCard)
        if (!pin) {
            throw new GPIOError('PIN_NOT_FOUND', "Le pin que vous avez renseigné n'est pas valide...", {code: 404})
        }
        return pin;
    }

    checkCardPinGetModule(pin: CardPin): GPIOModule {
        if (pin.GPIO.Pin < 0 || pin.GPIO.Pin > 16) {
            throw new GPIOError('PIN_NOT_FOUND', "Le pin du module GPIO demandé n'est pas correct...", {code: 500})
        }
        let module: GPIOModule | undefined = this.modulesBanc.find(module => module.API_Address == pin.GPIO.Module)
        if (!module) {
            throw new GPIOError('MODULE_GPIO_NOT_FOUND', "Le module GPIO demandé n'est pas correct...", {code: 500})
        }
        return module
    }

    // ----------------------------------------
    // Controller gateway functions

    readCardValuesFromGPIO(cardName: string): Card {
        return this.checkAndGetCard(cardName)
    }

    readPinValueFromGPIO(cardName: string, numberOnCard: string): CardPin {
        let card: Card = this.checkAndGetCard(cardName)
        return this.checkAndGetPin(card, numberOnCard)
    }

    writeValueToGPIO(cardName: string, numberOnCard: string, value: boolean): CardPin {
        let card: Card = this.checkAndGetCard(cardName)
        let pin: CardPin = this.checkAndGetPin(card, numberOnCard)
        let module: GPIOModule = this.checkCardPinGetModule(pin)
        this.writeValueToModuleRegisterFromObject(module, pin, value)
        return pin
    }

    getModule(moduleName:  number): GPIOModule {
        let foundModule = this.modulesBanc.find(module => module.API_Address === moduleName)
        if (!foundModule) {
            throw new GPIOError('MODULE_GPIO_NOT_FOUND', "Le module GPIO demandé n'a pas été trouvé...", {code: 404})
        }
        return foundModule
    }

    readAllCards(): Card[] {
        let cards = this.mainClass.MainModule.bancConfiguration?.Cards
        if (!cards) {
            throw new GPIOError('CARD_NOT_FOUND', "Les cartes de cette configuration n'ont pas été trouvées...", {code: 500})
        }
        return cards
    }

    getAllModules(): GPIOModule[] {
        let modules: GPIOModule[] = this.mainClass.GpioModule.modulesBanc
        if (!modules) {
            throw new GPIOError('CARD_NOT_FOUND', "Les cartes de cette configuration n'ont pas été trouvées...", {code: 500})
        }
        return modules
    }

    writeToModule(moduleNumber: string | number, pinNumber: string | number, state: string | boolean): GPIOModule {
        let moduleNumberInt: number = typeof moduleNumber == "string" ?  parseInt(moduleNumber) : moduleNumber
        let pinNumberInt: number = typeof pinNumber == "string" ? parseInt(pinNumber) : pinNumber
        if (isNaN(moduleNumberInt) || isNaN(pinNumberInt) ||
            (typeof state == "string" && !["true", "false"].includes(state))) {
            throw new GPIOError('PIN_OR_MODULE_GPIO_NOT_FOUND', "Le module et ou le pin et ou l'état ne sont pas au bon format...")
        }
        let stateBool = typeof state == "string" ? JSON.parse(state) : state
        return this.writeValueToModuleRegister(moduleNumberInt, pinNumberInt, stateBool)
    }

    getPinout(): Pinout[] {
        return this.mainClass.config.gpio.pinout
    }

    // ----------------------------------------
    // GPIO Interactions

    writeValueToModuleRegisterFromObject(module: GPIOModule, pin: CardPin, value: boolean): GPIOModule {
        let pinoutGroup: Pinout | undefined = this.mainClass.config.gpio.pinout.find(pinout => pinout.pins.includes(pin.GPIO.Pin))
        let registerNumber: number | undefined = pinoutGroup?.register_number
        let indexOfPinInRegister: number | undefined = pinoutGroup?.pins.indexOf(pin.GPIO.Pin)
        if (indexOfPinInRegister === undefined || pinoutGroup === undefined) {
            throw new GPIOError('PIN_NOT_FOUND', "Une drôle d'erreur est survenue...", {code: 500})
        }
        let selector = Math.pow(2, indexOfPinInRegister)
        if (registerNumber === undefined) {
            throw new GPIOError('MODULE_GPIO_NOT_FOUND', "Le numéro de register n'a pas été trouvé", {code: 500})
        }
        let checkRegister = structuredClone(module.registers[registerNumber])
        // 2 "if" below check if the value state is already at that state in the register
        // Ex: if the user want the pin to true but the register is already at true for this pin --> do nothing
        if (!value) {
            checkRegister = ~checkRegister // Binary NOT to the register to check if the value if "false"
        }
        if ((checkRegister & selector) > 0) { // Binary AND to the register and the wanted value
            return module // Do not continue if the state is already good
        }
        pin.state = value
        let newRegister = module.registers[registerNumber] + (value ? selector : selector*-1)
        module.registers[registerNumber] = newRegister
        this.sendWriteCommand(hexStringToNumber(module.I2C_Address_HEX), hexStringToNumber(pinoutGroup.GPIO_register_address_HEX), newRegister)
        return module
    }

    writeValueToModuleRegister(moduleNumber: number, pinNumber: number, value: boolean): GPIOModule {
        let pinoutGroup: Pinout | undefined = this.mainClass.config.gpio.pinout.find(pinout => pinout.pins.includes(pinNumber))
        let registerNumber: number | undefined = pinoutGroup?.register_number
        let indexOfPinInRegister: number | undefined = pinoutGroup?.pins.indexOf(pinNumber)
        if (indexOfPinInRegister === undefined || pinoutGroup === undefined) {
            throw new GPIOError('PIN_NOT_FOUND', "Le pin demandé n'a pas été trouvé...", {code: 500})
        }
        let selector = Math.pow(2, indexOfPinInRegister)
        if (registerNumber === undefined) {
            throw new GPIOError('MODULE_GPIO_NOT_FOUND', "Le numéro de register n'a pas été trouvé", {code: 500})
        }
        let module: GPIOModule | undefined = this.modulesBanc.find(module => module.API_Address == moduleNumber)
        if (!module) {
            throw new GPIOError('MODULE_GPIO_NOT_FOUND', "Le module demandé n'a pas été trouvé...", {code: 404})
        }
        let checkRegister = structuredClone(module.registers[registerNumber])
        // 2 "if" below check if the value state is already at that state in the register
        // Ex: if the user want the pin to true but the register is already at true for this pin --> do nothing
        if (!value) {
            checkRegister = ~checkRegister // Binary NOT to the register to check if the value if "false"
        }
        if ((checkRegister & selector) > 0) { // Binary AND to the register and the wanted value
            return module // Do not continue if the state is already good
        }
        if (!this.mainClass.MainModule.bancConfiguration) {
            throw new Error('Banc configuration not created and trying to wwrite to module...')
        }
        this.mainClass.MainModule.bancConfiguration.Cards.forEach(card => {
            card.pins.forEach(pin => {
                if (pin.GPIO.Pin == pinNumber && pin.GPIO.Module == moduleNumber) {pin.state = value}
            })
        })
        let newRegister = module.registers[registerNumber] + (value ? selector : selector*-1)
        module.registers[registerNumber] = newRegister
        this.sendWriteCommand(hexStringToNumber(module.I2C_Address_HEX), hexStringToNumber(pinoutGroup.GPIO_register_address_HEX), newRegister)
        return module
    }

    initialiseObjectsAndRegisters() {
        if (!this.mainClass.MainModule.bancConfiguration) {
            throw new Error('The GPIO Class started too early --> a variable is missing...')
        }
        for (let cardId in this.mainClass.MainModule.bancConfiguration.Cards) {
            let card: Card = this.mainClass.MainModule.bancConfiguration.Cards[cardId]
            if (!card) {
                throw new Error('This is a very strange error...')
            }
            try {
                card.pins.forEach(pin => {
                    if (pin.state === undefined) {
                        pin.state = this.mainClass.config.gpio.defaultState
                    }
                    this.writeValueToGPIO(card.cardName, pin.NumberOnCard, pin.state)
                })
            } catch (error) {
                this.mainClass.storeError(error)
            }
        }
    }
}
