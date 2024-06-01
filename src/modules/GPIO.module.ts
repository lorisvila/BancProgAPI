import {BinaryValue, Gpio} from "onoff";
import {App} from "~/server";
import {Card, CardPin} from "~/types/types";
import * as process from "node:process";
import {MainModule} from "~/modules/main.module";
import {GPIOError} from "~/types/errors";


export class GpioModule {

    mainClass: App

    constructor(mainClass: App) {
        this.mainClass = mainClass
        this.declarePins()
    }

    checkAndGetPin(cardName: string, NumberOnCard: string): CardPin {
        let card : Card | undefined = this.mainClass.MainModule.bancConfiguration?.Cards.find(card => card.cardName == cardName)
        if (!card) {
            throw new GPIOError('CARD_NOT_FOUND', "Le pin ou la carte que vous avez renseigné n'est pas valide...", {code: 404})
        }
        let pin: CardPin | undefined = card.pins.find(pin => pin.NumberOnCard == NumberOnCard)
        if (!pin) {
            throw new GPIOError('PIN_NOT_FOUND', "Le pin ou la carte que vous avez renseigné n'est pas valide...", {code: 404})
        }
        return pin;
    }

    readPinInterface(cardName: string, NumberOnCard: string): CardPin {
        let pin: CardPin = this.checkAndGetPin(cardName, NumberOnCard)
        /*let state = pin.object?.readSync()
        if (!state) {
            throw new GPIOError('ERROR_READING_STATE', "Une erreur est survenue lors de la lecture de l'état du pin...", {code: 500})
        }
        pin.state = state*/
        return pin
    }

    writePinInterface(cardName: string, NumberOnCard: string): void {
        let pin: CardPin = this.checkAndGetPin(cardName, NumberOnCard) // May throw error if pin isn't right

    }

    declarePins() {
        this.mainClass.MainModule.bancConfiguration?.Cards.forEach(card => {
            card.pins.forEach(pin => {
                //pin.object = new Gpio(pin.GPIO, 'out')
                if (pin.state == undefined) {
                    //this.writePin(pin.object, this.mainClass.config.app.defaultState)
                } else {
                    //this.writePin(pin.object, pin.state)
                }
            })
        })
    }

    unexportAllPins() { // TODO : Implémenter cette fonction sur le 'SIGINT'
        // TODO : Refaire la boucle sur chaque pin pour le libérer avec la fonction .unexport()
        // https://www.npmjs.com/package/onoff#unexport
    }

    writePin(pin: CardPin, state: BinaryValue): void {
        if (this.mainClass.config.app.defaultState) {state = 1 - state}
        if (!pin.object) {
            throw new GPIOError('ERROR_WRITING_STATE', "L'objet GPIO n'a pas été crée avant l'écriture sur le pin..", {code: 500})
        }
        pin.object.writeSync(state)
        pin.state = state
    }

}