import { injectable } from 'inversify'
import { IEntityMapper } from '../../port/entity.mapper.interface'
import { Institution } from '../../../application/domain/model/institution'
import { User } from '../../../application/domain/model/user'
import { UserEntity } from '../user.entity'

@injectable()
export class UserEntityMapper implements IEntityMapper<User, UserEntity> {
    public transform(item: any): any {
        if (item instanceof User) return this.modelToModelEntity(item)
        if (item instanceof UserEntity) return this.modelEntityToModel(item)
        return this.jsonToModel(item) // json
    }

    /**
     * Convert {User} for {UserEntity}.
     *
     * @see Creation Date should not be mapped to the type the repository understands.
     * Because this attribute is created automatically by the database.
     * Therefore, if a null value is passed at update time, an exception is thrown.
     * @param item
     */
    public modelToModelEntity(item: User): UserEntity {
        const result: UserEntity = new UserEntity()
        if (item.id) result.id = item.id
        if (item.username) result.username = item.username
        if (item.password) result.password = item.password
        if (item.type) result.type = item.type
        if (item.institution) result.institution = item.institution.id
        // if (item.gender) result.gender = item.gender
        // if (item.age) result.age = item.age
        // if (item.application_name) result.application_name = item.application_name
        //
        // if (item.children && item.children.constructor === Array) {
        //     const childrenTemp: Array<string> = item.children
        //     item.children.forEach(elem => childrenTemp.push(elem.id))
        //     result.children = childrenTemp
        // }
        //
        // if (item.children_groups && item.children_groups.constructor === Array) {
        //     const childrenGroupsTemp: Array<string> = item.children
        //     item.children.forEach(elem => childrenGroupsTemp.push(elem.id))
        //     result.children_groups = childrenGroupsTemp
        // }

        return result
    }

    /**
     * Convert {UserEntity} for {User}.
     *
     * @see Each attribute must be mapped only if it contains an assigned value,
     * because at some point the attribute accessed may not exist.
     * @param item
     */
    public modelEntityToModel(item: UserEntity): User {
        throw Error('Not implemented!')
    }

    /**
     * Convert JSON for {User}.
     *
     * @see Each attribute must be mapped only if it contains an assigned value,
     * because at some point the attribute accessed may not exist.
     * @param json
     */
    public jsonToModel(json: any): User {
        const result: User = new User()
        if (!json) return result

        if (json.id !== undefined) result.id = json.id
        if (json.username !== undefined) result.username = json.username
        if (json.password !== undefined) result.password = json.password
        if (json.type !== undefined) result.type = json.type
        if (json.institution !== undefined) result.institution = new Institution().deserialize(result.institution)

        return result
    }
}
