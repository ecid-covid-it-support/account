import { inject, injectable } from 'inversify'
import { IQuery } from '../port/query.interface'
import { Identifier } from '../../di/identifiers'
import { ILogger } from '../../utils/custom.logger'
import { ConflictException } from '../domain/exception/conflict.exception'
import { IInstitutionRepository } from '../port/institution.repository.interface'
import { ValidationException } from '../domain/exception/validation.exception'
import { Strings } from '../../utils/strings'
import { UserType } from '../domain/model/user'
import { IHealthProfessionalService } from '../port/health.professional.service.interface'
import { IHealthProfessionalRepository } from '../port/health.professional.repository.interface'
import { HealthProfessional } from '../domain/model/health.professional'
import { CreateHealthProfessionalValidator } from '../domain/validator/create.health.professional.validator'
import { ChildrenGroup } from '../domain/model/children.group'
import { IChildrenGroupService } from '../port/children.group.service.interface'
import { UpdateUserValidator } from '../domain/validator/update.user.validator'
import { IChildrenGroupRepository } from '../port/children.group.repository.interface'
import { UserUpdateEvent } from '../integration-event/event/user.update.event'
import { IEventBus } from '../../infrastructure/port/event.bus.interface'
import { ObjectIdValidator } from '../domain/validator/object.id.validator'
import { IIntegrationEventRepository } from '../port/integration.event.repository.interface'

/**
 * Implementing Health Professional Service.
 *
 * @implements {IHealthProfessionalService}
 */
@injectable()
export class HealthProfessionalService implements IHealthProfessionalService {

    constructor(
        @inject(Identifier.HEALTH_PROFESSIONAL_REPOSITORY) private readonly _healthProfessionalRepository:
            IHealthProfessionalRepository,
        @inject(Identifier.INSTITUTION_REPOSITORY) private readonly _institutionRepository: IInstitutionRepository,
        @inject(Identifier.CHILDREN_GROUP_SERVICE) private readonly _childrenGroupService: IChildrenGroupService,
        @inject(Identifier.CHILDREN_GROUP_REPOSITORY) private readonly _childrenGroupRepository: IChildrenGroupRepository,
        @inject(Identifier.INTEGRATION_EVENT_REPOSITORY)
        private readonly _integrationEventRepository: IIntegrationEventRepository,
        @inject(Identifier.RABBITMQ_EVENT_BUS) private readonly _eventBus: IEventBus,
        @inject(Identifier.LOGGER) private readonly _logger: ILogger) {
    }

    public async add(healthProfessional: HealthProfessional): Promise<HealthProfessional> {
        try {
            // 1. Validate Health Professional parameters.
            CreateHealthProfessionalValidator.validate(healthProfessional)

            // 1.5 Ignore last_login attribute if exists.
            if (healthProfessional.last_login) healthProfessional.last_login = undefined

            // 2. Checks if Health Professional already exists.
            const healthProfessionalExist = await this._healthProfessionalRepository.checkExist(healthProfessional)
            if (healthProfessionalExist) throw new ConflictException(Strings.HEALTH_PROFESSIONAL.ALREADY_REGISTERED)

            // 3. Checks if the institution exists.
            if (healthProfessional.institution && healthProfessional.institution.id !== undefined) {
                const institutionExist = await this._institutionRepository.checkExist(healthProfessional.institution)
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

        // 4. Create new Health Professional register.
        return this._healthProfessionalRepository.create(healthProfessional)
    }

    public async getAll(query: IQuery): Promise<Array<HealthProfessional>> {
        query.addFilter({ type: UserType.HEALTH_PROFESSIONAL })
        return this._healthProfessionalRepository.find(query)
    }

    public async getById(id: string, query: IQuery): Promise<HealthProfessional> {
        // 1. Validate id.
        ObjectIdValidator.validate(id)

        // 2. Find a health professional.
        query.addFilter({ _id: id, type: UserType.HEALTH_PROFESSIONAL })
        return this._healthProfessionalRepository.findOne(query)
    }

    public async update(healthProfessional: HealthProfessional): Promise<HealthProfessional> {
        try {
            // 1. Validate Health Professional parameters.
            UpdateUserValidator.validate(healthProfessional)

            // 2. Checks if Health Professional already exists.
            const id: string = healthProfessional.id!
            healthProfessional.id = undefined

            const healthProfessionalExist = await this._healthProfessionalRepository.checkExist(healthProfessional)
            if (healthProfessionalExist) throw new ConflictException(Strings.HEALTH_PROFESSIONAL.ALREADY_REGISTERED)

            healthProfessional.id = id

            // 3. Checks if the institution exists.
            if (healthProfessional.institution && healthProfessional.institution.id !== undefined) {
                const institutionExist = await this._institutionRepository.checkExist(healthProfessional.institution)
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

        // 4. Update Health Professional data.
        const healthProfessionalUp = await this._healthProfessionalRepository.update(healthProfessional)

        // 5. If updated successfully, the object is published on the message bus.
        if (healthProfessionalUp) {
            const event = new UserUpdateEvent<HealthProfessional>(
                'HealthProfessionalUpdateEvent', new Date(), healthProfessionalUp)

            if (!(await this._eventBus.publish(event, 'healthprofessionals.update'))) {
                // 5. Save Event for submission attempt later when there is connection to message channel.
                this.saveEvent(event)
            } else {
                this._logger.info(`User of type Health Professional with ID: ${healthProfessionalUp.id} has been updated`
                    .concat(' and published on event bus...'))
            }
        }
        // 6. Returns the created object.
        return Promise.resolve(healthProfessionalUp)
    }

    public async remove(id: string): Promise<boolean> {
        let isDeleted: boolean

        try {
            // 1. Validate id.
            ObjectIdValidator.validate(id)

            // 2. Delete the health professional by id and your children groups.
            isDeleted = await this._healthProfessionalRepository.delete(id)
            if (isDeleted) await this._childrenGroupRepository.deleteAllChildrenGroupsFromUser(id)
        } catch (err) {
            return Promise.reject(err)
        }

        // 3. Returns status for health professional deletion.
        return Promise.resolve(isDeleted)
    }

    public async saveChildrenGroup(healthProfessionalId: string, childrenGroup: ChildrenGroup): Promise<ChildrenGroup> {
        try {
            // 1. Validate id.
            ObjectIdValidator.validate(healthProfessionalId)
            // 2. Checks if the health professional exists.
            const healthProfessional: HealthProfessional =
                await this._healthProfessionalRepository.findById(healthProfessionalId)
            if (!healthProfessional || !healthProfessional.children_groups) {
                throw new ValidationException(
                    Strings.HEALTH_PROFESSIONAL.NOT_FOUND,
                    Strings.HEALTH_PROFESSIONAL.NOT_FOUND_DESCRIPTION
                )
            }

            // 3. Save children group.
            const childrenGroupResult: ChildrenGroup = await this._childrenGroupService.add(childrenGroup)

            // 4. Update health professional with group of children created.
            healthProfessional.addChildrenGroup(childrenGroupResult)
            await this._healthProfessionalRepository.update(healthProfessional)

            // 5. If everything succeeds, it returns the data of the created group.
            return Promise.resolve(childrenGroupResult)
        } catch (err) {
            return Promise.reject(err)
        }
    }

    public async getAllChildrenGroups(healthProfessionalId: string, query: IQuery): Promise<Array<ChildrenGroup>> {
        try {
            // 1. Validate id.
            ObjectIdValidator.validate(healthProfessionalId)

            // 2. Checks if the health professional exists.
            const healthProfessional: HealthProfessional =
                await this._healthProfessionalRepository.findById(healthProfessionalId)
            if (!healthProfessional || healthProfessional.id !== healthProfessionalId
                || (healthProfessional.children_groups && healthProfessional.children_groups.length === 0)) {
                return Promise.resolve([])
            }

            // 3. Retrieves children groups by health professional id.
            query.addFilter({ user_id: healthProfessionalId })
            return this._childrenGroupService.getAll(query)
        } catch (err) {
            return Promise.reject(err)
        }
    }

    public async getChildrenGroupById(healthProfessionalId: string, childrenGroupId: string, query: IQuery):
        Promise<ChildrenGroup | undefined> {

        try {
            // 1. Validate if health professional id or children group id is valid
            ObjectIdValidator.validate(healthProfessionalId)
            ObjectIdValidator.validate(childrenGroupId)

            // 2. Checks if the health professional exists.
            const healthProfessional: HealthProfessional = await this._healthProfessionalRepository.findById(healthProfessionalId)
            if (!healthProfessional || !healthProfessional.children_groups) return Promise.resolve(undefined)

            // 3. Verifies that the group of children belongs to the health professional.
            const checkGroups: Array<ChildrenGroup> = await healthProfessional.children_groups.filter((obj, pos, arr) => {
                return arr.map(childrenGroup => childrenGroup.id).indexOf(childrenGroupId) === pos
            })

            // 4. The group to be selected does not exist or is not assigned to the health professional.
            //    When the group is assigned the checkGroups array size will be equal to 1.
            if (checkGroups.length !== 1) return Promise.resolve(undefined)
        } catch (err) {
            return Promise.reject(err)
        }

        // 5. The group to be selected exists and is related to the health professional.
        // Then, it can be selected.
        return this._childrenGroupService.getById(childrenGroupId, query)
    }

    public async updateChildrenGroup(healthProfessionalId: string, childrenGroup: ChildrenGroup): Promise<ChildrenGroup> {
        try {
            // 1. Validate if health professional id or children group id is valid
            ObjectIdValidator.validate(healthProfessionalId)
            if (childrenGroup.id) ObjectIdValidator.validate(childrenGroup.id)

            // 1. Checks if the health professional exists.
            const healthProfessional: HealthProfessional = await this._healthProfessionalRepository.findById(healthProfessionalId)
            if (!healthProfessional) {
                throw new ValidationException(
                    Strings.HEALTH_PROFESSIONAL.NOT_FOUND,
                    Strings.HEALTH_PROFESSIONAL.NOT_FOUND_DESCRIPTION
                )
            }

            // 2. Update children group.
            const childrenGroupResult: ChildrenGroup = await this._childrenGroupService.update(childrenGroup)

            // 3. If everything succeeds, it returns the data of the created group.
            return Promise.resolve(childrenGroupResult)
        } catch (err) {
            return Promise.reject(err)
        }
    }

    public async deleteChildrenGroup(healthProfessionalId: string, childrenGroupId: string): Promise<boolean> {
        try {
            // 1. Validate if health professional id or children group id is valid
            ObjectIdValidator.validate(healthProfessionalId)
            ObjectIdValidator.validate(childrenGroupId)

            // 2. Checks if the health professional exists.
            const healthProfessional: HealthProfessional = await this._healthProfessionalRepository.findById(healthProfessionalId)
            if (!healthProfessional) {
                return Promise.resolve(true)
            }

            // 3. Remove the children group.
            const removeResult: boolean = await this._childrenGroupService.remove(childrenGroupId)

            // 4. Remove association with health professional
            if (removeResult) {
                const childrenGroup: ChildrenGroup = new ChildrenGroup()
                childrenGroup.id = childrenGroupId
                await healthProfessional.removeChildrenGroup(childrenGroup)

                // 5. Update health professional.
                await this._healthProfessionalRepository.update(healthProfessional)
            }

            // 6. Returns true if the operation was successful, otherwise false.
            return Promise.resolve(removeResult)
        } catch (err) {
            return Promise.reject(err)
        }
    }

    /**
     * Saves the event to the database.
     * Useful when it is not possible to run the event and want to perform the
     * operation at another time.
     * @param event
     */
    private saveEvent(event: UserUpdateEvent<HealthProfessional>): void {
        const saveEvent: any = event.toJSON()
        saveEvent.__operation = 'publish'
        saveEvent.__routing_key = 'healthprofessionals.update'
        this._integrationEventRepository
            .create(JSON.parse(JSON.stringify(saveEvent)))
            .then(() => {
                this._logger.warn(`Could not publish the event named ${event.event_name}.`
                    .concat(` The event was saved in the database for a possible recovery.`))
            })
            .catch(err => {
                this._logger.error(`There was an error trying to save the name event: ${event.event_name}.`
                    .concat(`Error: ${err.message}. Event: ${JSON.stringify(saveEvent)}`))
            })
    }
}
