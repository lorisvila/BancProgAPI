import {Card, CardPin, Commande, CommandeCondition, Etat, EtatState, OutputCommandOrState} from "~/types/types";
import {CommandError} from "~/types/errors";
import {App} from "~/server";

export class CommandsModule {

    mainClass: App
    ActualEtats: Etat[]
    ActualCommandes: Commande[]
    lastEtatRefresh: Date | undefined

    constructor(mainClass: App) {
        this.mainClass = mainClass
        if (!this.mainClass.MainModule.bancConfiguration) {
            throw new Error("Ceci est une drôle d'erreur...")
        }
        this.ActualEtats = this.mainClass.MainModule.bancConfiguration.Etats
        this.ActualCommandes = this.mainClass.MainModule.bancConfiguration.Commandes

        setInterval(() => { // TODO : A voir si nécessaire de le garder...
            this.refreshEtats()
        }, 10000)
    }

    getAllCommands(): Commande[] {
        return this.ActualCommandes
    }

    getAvailableCommands(): Commande[] {
        this.refreshEtats()
        let availableCommands: Commande[] = []
        for (let commandId in this.ActualCommandes) {
            let command: Commande = this.ActualCommandes[commandId]
            if(this.checkCommand(command) || !command.conditions) {
                availableCommands.push(command)
            }
        }
        return availableCommands
    }

    checkCommand(command: Commande): boolean {
        this.refreshEtats()
        if (command.conditions.length == 0) {
            return true
        }

        let goodCondition = false
        for (let conditionsId in command.conditions) {
            let conditions: CommandeCondition[] = command.conditions[conditionsId]
            let badSubCondition = false
            for (let conditionId in conditions) {
                let condition: CommandeCondition = conditions[conditionId]
                let wantedEtat = this.getEtat(condition.category)
                if ((condition.code != wantedEtat.actualCode && condition.code >= 0) ||
                    (condition.code*-1 == wantedEtat.actualCode && condition.code < 0)) {
                    // If the condition code is negative it means that I accept the condition if it is not at that *-1 state
                    // Ex : code:-3 --> I accept all codes except 3 ; Ex : code:3 --> I accept only code which is 3
                    badSubCondition = true
                    break
                }
            }
            if (!badSubCondition) {
                goodCondition = true
                break
            }
        }
        return goodCondition
    }

    sendCommand(commandShortName: string, force: boolean = false): void {
        let commandList: Commande[] = force ? this.ActualCommandes : this.getAvailableCommands()
        let commandFound: Commande | undefined = commandList.find(command => command.shortName === commandShortName)
        if (!commandFound) {
            if (!force && this.ActualCommandes.find(command => command.shortName === commandShortName)) {
                throw new CommandError('COMMAND_FORBIDDEN',
                    "La commande demandée n'est pas disponible dans cet état",
                    {code: 406})
            }
            throw new CommandError('COMMAND_NOT_FOUND',
                "La commande demandée n'a pas été trouvée...",
                {code: 404})
        }
        for (let outputId in commandFound.outputs) {
            let output: OutputCommandOrState = commandFound.outputs[outputId]
            for (let cardId in output.cards) {
                let card = output.cards[cardId]
                this.mainClass.GpioModule.writeValueToGPIO(card, output.NumberOnCard, output.state)
            }
        }
    }

    getAllEtats(): Etat[] {
        this.refreshEtats()
        return this.ActualEtats
    }

    getEtat(etatName: string): Etat {
        this.refreshEtats()
        let etatFound = this.ActualEtats.find(etat => etat.category == etatName)
        if (!etatFound) {
            throw new CommandError('ETAT_NOT_FOUND', "L'état demandé n'a pas été trouvé", {code: 404})
        }
        return etatFound
    }

    refreshEtats() {
        if (this.lastEtatRefresh && (new Date().getTime() - this.lastEtatRefresh.getTime())/1000 <= 1) {
            return
        }
        for (let etatId in this.ActualEtats) {
            let etat: Etat = this.ActualEtats[etatId]

            // Will be set to true when the actual state in the for loop is found
            let foundState: boolean = false
            for (let stateId in etat.states) {
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
                    break
                }
            }
            if (!foundState) {
                etat.actualCode = -1
                etat.actualState = undefined
            }
        }
        this.lastEtatRefresh = new Date()
    }

}