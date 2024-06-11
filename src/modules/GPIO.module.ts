import {App} from "~/server";
//import { init } from 'raspi'; TODO : Reactivate this line when run on raspberry pi
import { I2C } from 'raspi-i2c';
import {GPIOError} from "~/types/errors";
import {Card, CardPin, GPIOModule, Pinout} from "~/types/types";

// Node JS rasperry-pi https://www.npmjs.com/package/node-mcp23017
// https://www.npmjs.com/package/raspi-i2c


export class GpioModule {

    mainClass: App
    i2c: I2C
    modulesBanc: GPIOModule[]

    constructor(mainClass: App) {
        this.mainClass = mainClass
        this.modulesBanc = this.mainClass.config.gpio.modules
        this.initialiseObjectsAndRegisters()
    }

    // TODO : Activate this option when on RaspberryPi
    /*setupI2C() {
        try {
            init(() => {
                this.i2c = new I2C()
            });
        } catch (e) {
            throw new GPIOError('I2C_BUS_ERROR', "Erreur lors de l'ouverture du bus I2C")
        }
    }*/

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
        let card: Card = this.checkAndGetCard(cardName)
        return card
    }

    readPinValueFromGPIO(cardName: string, numberOnCard: string): CardPin {
        let card: Card = this.checkAndGetCard(cardName)
        let pin: CardPin = this.checkAndGetPin(card, numberOnCard)
        return pin
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

    writeToModule(moduleNumber: string, pinNumber: string, state: string): GPIOModule {
        let moduleNumberInt: number = parseInt(moduleNumber)
        let pinNumberInt: number = parseInt(pinNumber)
        if (isNaN(moduleNumberInt) || isNaN(pinNumberInt) || !["true", "false"].includes(state)) {
            throw new GPIOError('PIN_OR_MODULE_GPIO_NOT_FOUND', "Le module et ou le pin et ou l'état ne sont pas au bon format...")
        }
        let stateBool = JSON.parse(state)
        return this.writeValueToModuleRegister(moduleNumberInt, pinNumberInt, stateBool)
    }

    getPinout(): Pinout[] {
        return this.mainClass.config.gpio.pinout
    }

    // ----------------------------------------
    // GPIO Interactions

    writeValueToModuleRegisterFromObject(module: GPIOModule, pin: CardPin, value: boolean): void {
        let pinoutGroup: Pinout | undefined = this.mainClass.config.gpio.pinout.find(pinout => pinout.pins.includes(pin.GPIO.Pin))
        let registerNumber: number | undefined = pinoutGroup?.register_number
        let indexOfPinInRegister: number | undefined = pinoutGroup?.pins.indexOf(pin.GPIO.Pin)
        if (indexOfPinInRegister === undefined) {
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
            return // Do not continue if the state is already good
        }
        pin.state = value
        module.registers[registerNumber] = module.registers[registerNumber] + (value ? selector : selector*-1)
    }

    writeValueToModuleRegister(moduleNumber: number, pinNumber: number, value: boolean): GPIOModule {
        let pinoutGroup: Pinout | undefined = this.mainClass.config.gpio.pinout.find(pinout => pinout.pins.includes(pinNumber))
        let registerNumber: number | undefined = pinoutGroup?.register_number
        let indexOfPinInRegister: number | undefined = pinoutGroup?.pins.indexOf(pinNumber)
        if (indexOfPinInRegister === undefined) {
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
        module.registers[registerNumber] = module.registers[registerNumber] + (value ? selector : selector*-1)
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
            card.pins.forEach(pin => {
                if (pin.state === undefined) {
                    pin.state = this.mainClass.config.gpio.defaultState
                }
                this.writeValueToGPIO(card.cardName, pin.NumberOnCard, pin.state)
            })
        }
    }

}
