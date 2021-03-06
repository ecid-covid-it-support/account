import { inject, injectable } from 'inversify'
import { BaseRepository } from './base/base.repository'
import { UserType } from '../../application/domain/model/user'
import { IEntityMapper } from '../port/entity.mapper.interface'
import { ILogger } from '../../utils/custom.logger'
import { Identifier } from '../../di/identifiers'
import { Query } from './query/query'
import { IFamilyRepository } from '../../application/port/family.repository.interface'
import { Family } from '../../application/domain/model/family'
import { FamilyEntity } from '../entity/family.entity'
import { IUserRepository } from '../../application/port/user.repository.interface'
import { IQuery } from '../../application/port/query.interface'
import { Child } from '../../application/domain/model/child'

/**
 * Implementation of the family repository.
 * @implements {IFamilyRepository}
 */
@injectable()
export class FamilyRepository extends BaseRepository<Family, FamilyEntity> implements IFamilyRepository {

    constructor(
        @inject(Identifier.USER_REPO_MODEL) readonly familyModel: any,
        @inject(Identifier.FAMILY_ENTITY_MAPPER) readonly familyMapper: IEntityMapper<Family, FamilyEntity>,
        @inject(Identifier.USER_REPOSITORY) private readonly _userRepository: IUserRepository,
        @inject(Identifier.LOGGER) readonly logger: ILogger
    ) {
        super(familyModel, familyMapper, logger)
    }

    public create(item: Family): Promise<Family> {
        // Encrypt password
        if (item.password) item.password = this._userRepository.encryptPassword(item.password)
        const itemNew: Family = this.familyMapper.transform(item)
        return new Promise<Family>((resolve, reject) => {
            this.familyModel.create(itemNew)
                .then((result) => {
                    // Required due to 'populate ()' routine.
                    // If there is no need for 'populate ()', the return will suffice.
                    const query = new Query()
                    query.filters = { _id: result._id }
                    return resolve(this.findOne(query))
                })
                .catch(err => reject(super.mongoDBErrorListener(err)))
        })
    }

    public findAll(query: IQuery): Promise<Family[]> {
        query.addFilter({ type: UserType.FAMILY })
        return super.findAll(query)
    }

    public findOne(query: IQuery): Promise<Family> {
        const q: any = query.toJSON()
        const populate: any = { path: 'children' }

        // Checks if you have username in filters
        let usernameFilter: any
        const limit: number = q.pagination.limit
        if (q.filters.username) {
            usernameFilter = q.filters.username
            delete q.filters.username
        }

        // Checks if you have username in ordination/sort
        let usernameOrder: string | number
        if (q.ordination.username) {
            usernameOrder = q.ordination.username
            delete q.ordination.username
        }

        return new Promise<Family>((resolve, reject) => {
            this.familyModel.findOne(q.filters)
                .populate(populate)
                .exec()
                .then((result: Family) => {
                    if (!result) return resolve(undefined)

                    let children: Array<Child> = result.children ? result.children : []
                    if (children) {
                        if (usernameFilter) {
                            children = this.applyFilterByUsername(usernameFilter, children)
                        }

                        if (usernameOrder) {
                            if (usernameOrder === 'asc' || usernameOrder === 1) children.sort(this.compareAsc)
                            else children.sort(this.compareDesc)
                        }

                        if (children.length > limit) {
                            children = children.slice(0, limit)
                        }
                    }

                    result.children = children

                    return resolve(this.familyMapper.transform(result))
                })
                .catch(err => reject(super.mongoDBErrorListener(err)))
        })
    }

    public update(item: Family): Promise<Family> {
        const itemUp: any = this.familyMapper.transform(item)
        const populate: any = { path: 'children' }

        return new Promise<Family>((resolve, reject) => {
            this.familyModel.findOneAndUpdate({ _id: itemUp.id }, itemUp, { new: true })
                .populate(populate)
                .exec()
                .then((result: Family) => {
                    if (!result) return resolve(undefined)
                    return resolve(this.familyMapper.transform(result))
                })
                .catch(err => reject(super.mongoDBErrorListener(err)))
        })
    }

    public findById(familyId: string): Promise<Family> {
        const query: Query = new Query()
        query.filters = { _id: familyId, type: UserType.FAMILY }
        return this.findOne(query)
    }

    public checkExist(family: Family): Promise<boolean> {
        const query: Query = new Query()
        if (family.id) query.filters = { _id: family.id }

        query.addFilter({ type: UserType.FAMILY })
        return new Promise<boolean>((resolve, reject) => {
            this.familyModel.find(query.filters)
                .exec()
                .then((result: Array<Family>) => {
                    if (family.id) {
                        if (result.length > 0) return resolve(true)
                        return resolve(false)
                    }
                    return resolve(result.some(value => value.username === family.username))
                })
                .catch(err => reject(super.mongoDBErrorListener(err)))
        })
    }

    public disassociateChildFromFamily(childId: string): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            return this.familyModel.updateMany({ children: { $in: childId } },
                { $pullAll: { children: [childId] } },
                { multi: true }, (err) => {
                    if (err) return reject(super.mongoDBErrorListener(err))
                    return resolve(true)
                })
        })
    }

    public count(): Promise<number> {
        return super.count(new Query().fromJSON({ filters: { type: UserType.FAMILY } }))
    }

    public countChildrenFromFamily(familyId: string): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            super.findOne(new Query().fromJSON({ filters: { _id: familyId } }))
                .then(result => resolve(result && result.children ? result.children.length : 0))
                .catch(err => reject(this.mongoDBErrorListener(err)))
        })
    }
}
