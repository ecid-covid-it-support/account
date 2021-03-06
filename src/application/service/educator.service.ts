import { inject, injectable } from 'inversify'
import { IQuery } from '../port/query.interface'
import { Identifier } from '../../di/identifiers'
import { ILogger } from '../../utils/custom.logger'
import { ConflictException } from '../domain/exception/conflict.exception'
import { IInstitutionRepository } from '../port/institution.repository.interface'
import { ValidationException } from '../domain/exception/validation.exception'
import { Strings } from '../../utils/strings'
import { IEducatorService } from '../port/educator.service.interface'
import { IEducatorRepository } from '../port/educator.repository.interface'
import { Educator } from '../domain/model/educator'
import { CreateEducatorValidator } from '../domain/validator/create.educator.validator'
import { ChildrenGroup } from '../domain/model/children.group'
import { IChildrenGroupService } from '../port/children.group.service.interface'
import { IChildrenGroupRepository } from '../port/children.group.repository.interface'
import { IEventBus } from '../../infrastructure/port/eventbus.interface'
import { ObjectIdValidator } from '../domain/validator/object.id.validator'
import { UpdateEducatorValidator } from '../domain/validator/update.educator.validator'

/**
 * Implementing educator Service.
 *
 * @implements {IEducatorService}
 */
@injectable()
export class EducatorService implements IEducatorService {

    constructor(@inject(Identifier.EDUCATOR_REPOSITORY) private readonly _educatorRepository: IEducatorRepository,
                @inject(Identifier.INSTITUTION_REPOSITORY) private readonly _institutionRepository: IInstitutionRepository,
                @inject(Identifier.CHILDREN_GROUP_REPOSITORY) private readonly _childrenGroupRepository: IChildrenGroupRepository,
                @inject(Identifier.CHILDREN_GROUP_SERVICE) private readonly _childrenGroupService: IChildrenGroupService,
                @inject(Identifier.RABBITMQ_EVENT_BUS) private readonly _eventBus: IEventBus,
                @inject(Identifier.LOGGER) private readonly _logger: ILogger) {
    }

    public async add(educator: Educator): Promise<Educator> {
        try {
            // 1. Validate Educator parameters.
            CreateEducatorValidator.validate(educator)

            // 1.5 Ignore last_login attribute if exists.
            if (educator.last_login) educator.last_login = undefined

            // 2. Checks if Educator already exists.
            const educatorExist = await this._educatorRepository.checkExist(educator)
            if (educatorExist) throw new ConflictException(Strings.EDUCATOR.ALREADY_REGISTERED)

            // 3. Checks if the institution exists.
            if (educator.institution && educator.institution.id !== undefined) {
                const institutionExist = await this._institutionRepository.checkExist(educator.institution)
                if (!institutionExist) {
                    throw new ValidationException(
                        Strings.INSTITUTION.REGISTER_REQUIRED,
                        Strings.INSTITUTION.ALERT_REGISTER_REQUIRED
                    )
                }
            }
        } catch (err) {
            return Promise.reject(err)
        }
        // 4. Create new Educator register.
        return this._educatorRepository.create(educator)
    }

    public async getAll(query: IQuery): Promise<Array<Educator>> {
        // The repository findAll() method applies specific logic because of filters with the username.
        // This is necessary because the username is saved encrypted in the database.
        // Otherwise, the find() method would suffice.
        return this._educatorRepository.findAll(query)
    }

    public async getById(id: string, query: IQuery): Promise<Educator> {
        // 1. Validate id.
        ObjectIdValidator.validate(id, Strings.EDUCATOR.PARAM_ID_NOT_VALID_FORMAT)

        // 2. Get a educator.
        return this._educatorRepository.findOne(query)
    }

    public async update(educator: Educator): Promise<Educator | undefined> {
        try {
            // 1. Validate Educator parameters.
            UpdateEducatorValidator.validate(educator)

            // 2. checks if the educator exists by id
            if (!(await this._educatorRepository.checkExist(educator))) {
                return Promise.resolve(undefined)
            }

            // 3. Check if there is already an educator with the same username to be updated.
            if (educator.username) {
                const id: string = educator.id!
                educator.id = undefined
                if (await this._educatorRepository.checkExist(educator)) {
                    throw new ConflictException(Strings.EDUCATOR.ALREADY_REGISTERED)
                }
                educator.id = id
            }

            // 4. Checks if the institution exists.
            if (educator.institution && educator.institution.id !== undefined) {
                const institutionExist = await this._institutionRepository.checkExist(educator.institution)
                if (!institutionExist) {
                    throw new ValidationException(
                        Strings.INSTITUTION.REGISTER_REQUIRED,
                        Strings.INSTITUTION.ALERT_REGISTER_REQUIRED
                    )
                }
            }

            // 5. Update Educator data.
            const educatorUp = await this._educatorRepository.update(educator)

            // 6. If updated successfully, the object is published on the message bus.
            if (educatorUp) {
                this._eventBus.bus
                    .pubUpdateEducator(educatorUp)
                    .then(() => {
                        this._logger.info(`User of type Educator with ID: ${educatorUp.id} has been updated`
                            .concat(' and published on event bus...'))
                    })
                    .catch((err) => {
                        this._logger.error(`Error trying to publish event UpdateEducator. ${err.message}`)
                    })
            }
            // 7. Returns the created object.
            return Promise.resolve(educatorUp)
        } catch (err) {
            return Promise.reject(err)
        }
    }

    public async remove(id: string): Promise<boolean> {
        let isDeleted: boolean
        try {
            // 1. Validate id.
            ObjectIdValidator.validate(id, Strings.EDUCATOR.PARAM_ID_NOT_VALID_FORMAT)

            // 2.Delete the educator by id and your children groups.
            isDeleted = await this._educatorRepository.delete(id)
            if (isDeleted) await this._childrenGroupRepository.deleteAllChildrenGroupsFromUser(id)
        } catch (err) {
            return Promise.reject(err)
        }

        // 3. Returns status for educator deletion.
        return Promise.resolve(isDeleted)
    }

    public async saveChildrenGroup(educatorId: string, childrenGroup: ChildrenGroup): Promise<ChildrenGroup> {
        try {
            // 1. Validate id.
            ObjectIdValidator.validate(educatorId, Strings.EDUCATOR.PARAM_ID_NOT_VALID_FORMAT)

            // 2. Checks if the educator exists.
            const educator: Educator = await this._educatorRepository.findById(educatorId)
            if (!educator || !educator.children_groups) {
                throw new ValidationException(
                    Strings.EDUCATOR.NOT_FOUND,
                    Strings.EDUCATOR.NOT_FOUND_DESCRIPTION
                )
            }

            // 2. Save children group.
            const childrenGroupResult: ChildrenGroup = await this._childrenGroupService.add(childrenGroup)

            // 3. Update educator with group of children created.
            educator.addChildrenGroup(childrenGroupResult)
            await this._educatorRepository.update(educator)

            // 4. If everything succeeds, it returns the data of the created group.
            return Promise.resolve(childrenGroupResult)
        } catch (err) {
            return Promise.reject(err)
        }
    }

    public async getAllChildrenGroups(educatorId: string, query: IQuery): Promise<Array<ChildrenGroup>> {
        try {
            // 1. Validate id.
            ObjectIdValidator.validate(educatorId, Strings.EDUCATOR.PARAM_ID_NOT_VALID_FORMAT)

            // 2. Checks if the educator exists.
            const educator: Educator = await this._educatorRepository.findById(educatorId)
            if (!educator || educator.id !== educatorId) {
                throw new ValidationException(
                    Strings.EDUCATOR.NOT_FOUND,
                    Strings.EDUCATOR.NOT_FOUND_DESCRIPTION
                )
            } else if (educator.children_groups && educator.children_groups.length === 0) {
                return Promise.resolve([])
            }

            // 3. Retrieves children groups by educator id.
            return this._childrenGroupService.getAll(query)
        } catch (err) {
            return Promise.reject(err)
        }
    }

    public async getChildrenGroupById(educatorId: string, childrenGroupId: string, query: IQuery):
        Promise<ChildrenGroup | undefined> {
        try {
            // 1. Validate if educator id or children group id is valid
            ObjectIdValidator.validate(educatorId, Strings.EDUCATOR.PARAM_ID_NOT_VALID_FORMAT)
            ObjectIdValidator.validate(childrenGroupId, Strings.CHILDREN_GROUP.PARAM_ID_NOT_VALID_FORMAT)

            // 2. Checks if the educator exists.
            const educator: Educator = await this._educatorRepository.findById(educatorId)
            if (!educator) {
                throw new ValidationException(
                    Strings.EDUCATOR.NOT_FOUND,
                    Strings.EDUCATOR.NOT_FOUND_DESCRIPTION
                )
            } else if (!educator.children_groups) return Promise.resolve(undefined)

            // 3. Verifies that the group of children belongs to the educator.
            const checkGroups: Array<ChildrenGroup> = await educator.children_groups.filter((obj, pos, arr) => {
                return arr.map(childrenGroup => childrenGroup.id).indexOf(childrenGroupId) === pos
            })

            // 4. The group to be selected does not exist or is not assigned to the educator.
            //    When the group is assigned the checkGroups array size will be equal to 1.
            if (checkGroups.length !== 1) return Promise.resolve(undefined)
        } catch (err) {
            return Promise.reject(err)
        }

        // 5. The group to be selected exists and is related to the educator.
        // Then, it can be selected.
        return this._childrenGroupService.getById(childrenGroupId, query)
    }

    public async updateChildrenGroup(educatorId: string, childrenGroup: ChildrenGroup): Promise<ChildrenGroup | undefined> {
        try {
            // 1. Validate if educator id or children group id is valid
            ObjectIdValidator.validate(educatorId, Strings.EDUCATOR.PARAM_ID_NOT_VALID_FORMAT)
            if (childrenGroup.id) ObjectIdValidator.validate(childrenGroup.id, Strings.CHILDREN_GROUP.PARAM_ID_NOT_VALID_FORMAT)

            // 2. Checks if the educator exists.
            const educator: Educator = await this._educatorRepository.findById(educatorId)
            if (!educator) {
                throw new ValidationException(
                    Strings.EDUCATOR.NOT_FOUND,
                    Strings.EDUCATOR.NOT_FOUND_DESCRIPTION
                )
            }

            // 3. Update children group.
            const childrenGroupResult = await this._childrenGroupService.update(childrenGroup)

            // 4. If everything succeeds, it returns the data of the created group.
            return Promise.resolve(childrenGroupResult)
        } catch (err) {
            return Promise.reject(err)
        }
    }

    public async deleteChildrenGroup(educatorId: string, childrenGroupId: string): Promise<boolean> {
        try {
            // 1. Validate if educator id or children group id is valid
            ObjectIdValidator.validate(educatorId, Strings.EDUCATOR.PARAM_ID_NOT_VALID_FORMAT)
            ObjectIdValidator.validate(childrenGroupId, Strings.CHILDREN_GROUP.PARAM_ID_NOT_VALID_FORMAT)

            // 2. Checks if the educator exists.
            const educator: Educator = await this._educatorRepository.findById(educatorId)
            if (!educator) {
                return Promise.resolve(true)
            }

            // 3. Remove the children group
            const removeResult: boolean = await this._childrenGroupService.remove(childrenGroupId)

            // 4. Remove association with educator
            if (removeResult) {
                const childrenGroup: ChildrenGroup = new ChildrenGroup()
                childrenGroup.id = childrenGroupId
                await educator.removeChildrenGroup(childrenGroup)

                // 5. Update educator.
                await this._educatorRepository.update(educator)
            }

            // 6. Returns true if the operation was successful, otherwise false.
            return Promise.resolve(removeResult)
        } catch (err) {
            return Promise.reject(err)
        }
    }

    public count(): Promise<number> {
        return this._educatorRepository.count()
    }

    public countChildrenGroups(educatorId: string): Promise<number> {
        return this._educatorRepository.countChildrenGroups(educatorId)
    }
}
