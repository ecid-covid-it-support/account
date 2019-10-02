import { inject, injectable } from 'inversify'
import { BaseRepository } from './base/base.repository'
import { UserType } from '../../application/domain/model/user'
import { IEntityMapper } from '../port/entity.mapper.interface'
import { ILogger } from '../../utils/custom.logger'
import { Identifier } from '../../di/identifiers'
import { Query } from './query/query'
import { IApplicationRepository } from '../../application/port/application.repository.interface'
import { Application } from '../../application/domain/model/application'
import { ApplicationEntity } from '../entity/application.entity'
import { IUserRepository } from '../../application/port/user.repository.interface'
import { IQuery } from '../../application/port/query.interface'

// import { IQuery } from '../../application/port/query.interface'

/**
 * Implementation of the repository for user of type Application.
 *
 * @implements {IApplicationRepository}
 */
@injectable()
export class ApplicationRepository extends BaseRepository<Application, ApplicationEntity> implements IApplicationRepository {

    constructor(
        @inject(Identifier.USER_REPO_MODEL) readonly applicationModel: any,
        @inject(Identifier.APPLICATION_ENTITY_MAPPER) readonly applicationMapper: IEntityMapper<Application, ApplicationEntity>,
        @inject(Identifier.USER_REPOSITORY) private readonly _userRepository: IUserRepository,
        @inject(Identifier.LOGGER) readonly logger: ILogger
    ) {
        super(applicationModel, applicationMapper, logger)
    }

    public create(item: Application): Promise<Application> {
        // Encrypt password
        if (item.password) item.password = this._userRepository.encryptPassword(item.password)
        const itemNew: Application = this.mapper.transform(item)
        return new Promise<Application>((resolve, reject) => {
            this.applicationModel.create(itemNew)
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

    public find(query: IQuery): Promise<Array<Application>> {
        query.addFilter({ type: UserType.APPLICATION })
        const q: any = query.toJSON()

        let usernameFilter: string
        if (q.filters.username) {
            usernameFilter = q.filters.username
            delete q.filters.username
        }

        return new Promise<Array<Application>>((resolve, reject) => {
            this.Model.find(q.filters)
                .sort(q.ordination)
                .skip(Number((q.pagination.limit * q.pagination.page) - q.pagination.limit))
                .limit(Number(q.pagination.limit))
                .exec() // execute query
                .then((result: Array<Application>) => {
                    if (usernameFilter) return resolve(super.findByUsername(usernameFilter, result))
                    resolve(result.map(item => this.mapper.transform(item)))
                })
                .catch(err => reject(this.mongoDBErrorListener(err)))
        })
    }

    public checkExist(application: Application): Promise<boolean> {
        const query: Query = new Query()
        if (application.id) query.filters = { _id: application.id }

        query.addFilter({ type: UserType.APPLICATION })
        return new Promise<boolean>((resolve, reject) => {
            this.applicationModel.find(query.filters)
                .exec()
                .then((result: Array<Application>) => {
                    if (application.id) {
                        if (result.length > 0) return resolve(true)
                        return resolve(false)
                    }
                    return resolve(result.some(value => value.username === application.username))
                })
                .catch(err => reject(super.mongoDBErrorListener(err)))
        })
    }

    public count(): Promise<number> {
        return super.count(new Query().fromJSON({ filters: { type: UserType.APPLICATION } }))
    }
}
