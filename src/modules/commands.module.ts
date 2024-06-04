import {App} from "~/server";
import {Card, CardPin, Commande, Etat, EtatState, OutputCommandOrState} from "~/types/types";
import e from "cors";

export class CommandsModule {

    mainClass: App
    ActualEtats: Etat[]
    ActualCommandes: Commande[]

    constructor(mainClass: App) {
        this.mainClass = mainClass
        if (!this.mainClass.MainModule.bancConfiguration) {
            throw new Error("Ceci est une drôle d'erreur...")
        }
        this.ActualEtats = this.mainClass.MainModule.bancConfiguration.Etats
        this.ActualCommandes = this.mainClass.MainModule.bancConfiguration.Commandes
    }

    getAllCommands(): Commande[] {
        return this.ActualCommandes
    }

    getAvailableCommands() {
        this.refreshEtats()
        for (let command in this.ActualCommandes) {

        }
    }

    getEtats(): Etat[] {
        this.refreshEtats()
        return this.ActualEtats
    }

    refreshEtats() {
        for (let etatId in this.ActualEtats) {
            let etat: Etat = this.ActualEtats[etatId]

            // Will be set to true when the actual state in the for loop is found
            let foundState: boolean = false
            for (let stateId in etat.states) {
                if (foundState) {break}
                let state: EtatState = etat.states[stateId]

                // will be set to false if a condition is wrong --> if it stays true it means that all conditions are right
                let goodState: boolean = true
                for (let outputId in state.outputs) {
                    let output: OutputCommandOrState = state.outputs[outputId]

                    for (let cardToCheckId in output.cards) {
                        let cardToCheck: string = output.cards[cardToCheckId]
                        let card: Card = this.mainClass.GpioModule.checkAndGetCard(cardToCheck)
                        let outputOfCard: CardPin = this.mainClass.GpioModule.checkAndGetPin(card, output.NumberOnCard)
                        if (!outputOfCard.state == output.state) {
                            goodState = false
                            break
                        }
                    }
                }
                if (goodState) {
                    etat.actualCode = state.code
                    etat.actualState = state
                    foundState = true
                }
            }
            if (!foundState) {
                etat.actualCode = -1
                etat.actualState = undefined
            }
        }
    }

}