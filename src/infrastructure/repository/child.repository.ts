import { inject, injectable } from 'inversify'
import { BaseRepository } from './base/base.repository'
import { UserType } from '../../application/domain/model/user'
import { IChildRepository } from '../../application/port/child.repository.interface'
import { Child } from '../../application/domain/model/child'
import { ChildEntity } from '../entity/child.entity'
import { IEntityMapper } from '../port/entity.mapper.interface'
import { ILogger } from '../../utils/custom.logger'
import { Identifier } from '../../di/identifiers'
import { Query } from './query/query'
import { ValidationException } from '../../application/domain/exception/validation.exception'
import { IUserRepository } from '../../application/port/user.repository.interface'
import { IQuery } from '../../application/port/query.interface'

// import { IQuery } from '../../application/port/query.interface'

/**
 * Implementation of the child repository.
 *
 * @implements {IChildRepository}
 */
@injectable()
export class ChildRepository extends BaseRepository<Child, ChildEntity> implements IChildRepository {

    constructor(
        @inject(Identifier.USER_REPO_MODEL) readonly childModel: any,
        @inject(Identifier.CHILD_ENTITY_MAPPER) readonly childMapper: IEntityMapper<Child, ChildEntity>,
        @inject(Identifier.USER_REPOSITORY) private readonly _userRepository: IUserRepository,
        @inject(Identifier.LOGGER) readonly logger: ILogger
    ) {
        super(childModel, childMapper, logger)
    }

    public create(item: Child): Promise<Child> {
        // Encrypt password
        if (item.password) item.password = this._userRepository.encryptPassword(item.password)
        const itemNew: Child = this.childMapper.transform(item)
        return new Promise<Child>((resolve, reject) => {
            this.childModel.create(itemNew)
                .then((result) => {
                    // Required due to 'populate ()' routine.
                    // If there is no need for 'populate ()', the return will suffice.
                    const query = new Query()
                    query.filters = result._id
                    return resolve(super.findOne(query))
                })
                .catch(err => reject(super.mongoDBErrorListener(err)))
        })
    }

    public findAll(query: IQuery): Promise<Array<Child>> {
        query.addFilter({ type: UserType.CHILD })
        return super.findAll(query)
    }

    public checkExist(children: Child | Array<Child>): Promise<boolean | ValidationException> {
        const query: Query = new Query()

        return new Promise<boolean | ValidationException>((resolve, reject) => {
            if (children instanceof Array) {
                if (children.length === 0) return resolve(false)

                let count = 0
                const resultChildrenIDs: Array<string> = []
                children.forEach((child: Child) => {
                    query.filters = { type: UserType.CHILD }
                    if (child.id) query.addFilter({ _id: child.id })

                    super.findOne(query)
                        .then(result => {
                            count++
                            if (!result && child.id) resultChildrenIDs.push(child.id)
                            if (count === children.length) {
                                if (resultChildrenIDs.length > 0) {
                                    return resolve(new ValidationException(resultChildrenIDs.join(', ')))
                                }
                                return resolve(true)
                            }
                        })
                        .catch(err => reject(super.mongoDBErrorListener(err)))
                })
            } else {
                query.filters = { type: UserType.CHILD }
                if (children.id) query.addFilter({ _id: children.id })

                this.childModel.find(query.filters)
                    .exec()
                    .then((result: Array<Child>) => {
                        if (children.id) {
                            if (result.length) return resolve(true)
                            return resolve(false)
                        }
                        return resolve(result.some(value => value.username === children.username))
                    })
                    .catch(err => reject(super.mongoDBErrorListener(err)))
            }
        })
    }

    public count(): Promise<number> {
        return super.count(new Query().fromJSON({ filters: { type: UserType.CHILD } }))
    }
}
