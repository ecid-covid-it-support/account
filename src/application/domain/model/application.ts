import { ISerializable } from '../utils/serializable.interface'
import { User, UserType } from './user'
import { JsonUtils } from '../utils/json.utils'

/**
 * Implementation of the application entity.
 *
 * @extends {User}
 * @implements {ISerializable<Application>}
 */
export class Application extends User implements ISerializable<Application> {
    private _application_name?: string // Name of application.

    constructor() {
        super()
        super.type = UserType.APPLICATION
    }

    get application_name(): string | undefined {
        return this._application_name
    }

    set application_name(value: string | undefined) {
        this._application_name = value
    }

    /**
     * Convert this object to json.
     *
     * @returns {object}
     */
    public serialize(): any {
        return Object.assign(super.serialize(), {
            application_name: this.application_name
        })
    }

    /**
     * Transform JSON into Application object.
     *
     * @param json
     * @return Application
     */
    public deserialize(json: any): Application {
        if (!json) return this
        super.deserialize(json)

        if (typeof json === 'string' && JsonUtils.isJsonString(json)) {
            json = JSON.parse(json)
        }

        if (json.application_name !== undefined) this.application_name = json.application_name

        return this
    }
}