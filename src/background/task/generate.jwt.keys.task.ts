import pem from 'pem'
import fs from 'fs'
import { inject, injectable } from 'inversify'
import { Identifier } from '../../di/identifiers'
import { ILogger } from '../../utils/custom.logger'
import { Default } from '../../utils/default'
import { IBackgroundTask } from '../../application/port/background.task.interface'

const jwt_private_key_path = process.env.JWT_PRIVATE_KEY_PATH || Default.JWT_PRIVATE_KEY_PATH
const jwt_public_key_path = process.env.JWT_PUBLIC_KEY_PATH || Default.JWT_PUBLIC_KEY_PATH

@injectable()
export class GenerateJwtKeysTask implements IBackgroundTask {

    constructor(@inject(Identifier.LOGGER) private readonly _logger: ILogger) {
    }

    public async run(): Promise<void> {
        await this.generateKeys()
    }

    public async generateKeys(): Promise<void> {
        if (!fs.existsSync(jwt_private_key_path) || !fs.existsSync(jwt_public_key_path)) {
            try {
                const privateKey = await this.generateJWTPrivateKey()
                const publicKey = await this.getJWTPublicKey(privateKey)
                fs.writeFileSync(jwt_private_key_path, privateKey, 'ascii')
                fs.writeFileSync(jwt_public_key_path, publicKey, 'ascii')
            } catch (err) {
                this._logger.error(`Failure generating JWT keys: ${err.message}`)
            }
        }
    }

    public async generateJWTPrivateKey(): Promise<any> {
        return new Promise((resolve, reject) => {
            pem.createPrivateKey((err, key) => {
                if (err) return reject(new Error(err.message))
                return resolve(key.key)
            })
        })
    }

    public async getJWTPublicKey(privateKey): Promise<any> {
        return new Promise((resolve, reject) => {
            pem.getPublicKey(privateKey, (err, key) => {
                if (err) return reject(new Error(err.message))
                return resolve(key.publicKey)
            })
        })
    }

    public stop(): Promise<void> {
        return Promise.resolve()
    }
}
