import {App} from "~/server";
import {BancConfig, RedisInstructionType} from "~/types/types";
import {Logger} from "pino";
import Redis, {RedisOptions} from "ioredis";

export class MainModule {

    mainClass: App
    bancConfiguration: BancConfig | undefined

    generalPurposeRedis: Redis
    subscribeRedis: Redis

    logger: Logger

    constructor(mainClass: App) {
        this.mainClass = mainClass
        this.logger = this.mainClass.AppLogger.createChildLogger(this.constructor.name)
        this.logger.info(`Initializing class ${this.constructor.name}`)
        this.importConfigBanc()

        let redisOptions: RedisOptions = {
            password: this.mainClass.config.redis.password,
            host: this.mainClass.config.redis.host,
            port: this.mainClass.config.redis.port,
            autoResubscribe: true,
            retryStrategy: (times: number) => {
                let delay = this.mainClass.config.redis.reconnectTimeout;
                this.logger.warn(`Retrying to reconnect to redis in ${delay} seconds`)
                return delay * 1000
            },
        }

        if (this.mainClass.config.redis) {
            this.generalPurposeRedis = new Redis(redisOptions)
            this.subscribeRedis = new Redis(redisOptions)
        } else {
            this.logger.error('Section de la configuration pour la plateforme Redis vide...')
        }

        this.generalPurposeRedis.on('connect', () => {
            this.logger.info('Connected to generalPurposeRedis')
        })

        this.subscribeRedis.on('connect', () => {
            this.logger.info('Connected to subscribeRedis')
            this.subscribeRedis.subscribe(
                `${this.mainClass.config.redis.selfRedisName}_Event`,
                `${this.mainClass.config.redis.selfRedisName}_Queue`)
        })

        this.subscribeRedis.on('message', (channel, message) => {
            this.logger.info(`Received message from "${channel}" with data ${message}`)
        })

        this.generalPurposeRedis.on('error', (err) => {
            this.logger.error("General Purpose Redis error :")
            this.logger.error(err)
        })

        this.subscribeRedis.on('error', (err) => {
            this.logger.error("Subscribe Redis error :")
            this.logger.error(err)
        })
    }

    get allRedisUp(): boolean {
        return (this.subscribeRedis.status == "ready" && this.generalPurposeRedis.status == "ready")
    }

    addInstructionToRedis(destinationAPI: string, command: RedisInstructionType) {
        this.generalPurposeRedis.publish(`${destinationAPI}_Event`, JSON.stringify({instructionName: command.instructionName}))
        this.generalPurposeRedis.rpush(`${destinationAPI}_Queue`, JSON.stringify(command))
    }

    importConfigBanc(configurationName?: string) {
        if (!configurationName) {
            configurationName = this.mainClass.config.app.defaultConfig
        }
        this.logger.info(`Loading the configuration : ${configurationName}`)
        this.bancConfiguration = this.mainClass.config.configs.find((config) => config.Name == configurationName)
        if (!this.bancConfiguration) {
            throw Error(`La configuration ${this.mainClass.config.app.defaultConfig} n'a pas été trouvée...`)
        }
    }

}
