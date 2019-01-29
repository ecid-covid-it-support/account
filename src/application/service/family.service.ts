import { inject, injectable } from 'inversify'
import { IQuery } from '../port/query.interface'
import { Identifier } from '../../di/identifiers'
import { ILogger } from '../../utils/custom.logger'
import { ConflictException } from '../domain/exception/conflict.exception'
import { ValidationException } from '../domain/exception/validation.exception'
import { IFamilyService } from '../port/family.service.interface'
import { Family } from '../domain/model/family'
import { FamilyValidator } from '../domain/validator/family.validator'
import { IFamilyRepository } from '../port/family.repository.interface'
import { Child } from '../domain/model/child'
import { IChildRepository } from '../port/child.repository.interface'
import { IInstitutionRepository } from '../port/institution.repository.interface'
import { Strings } from '../../utils/strings'
import { UserType } from '../domain/model/user'
import { Query } from '../../infrastructure/repository/query/query'

/**
 * Implementing family Service.
 *
 * @implements {IFamilyService}
 */
@injectable()
export class FamilyService implements IFamilyService {

    constructor(@inject(Identifier.FAMILY_REPOSITORY) private readonly _familyRepository: IFamilyRepository,
                @inject(Identifier.CHILD_REPOSITORY) private readonly _childRepository: IChildRepository,
                @inject(Identifier.INSTITUTION_REPOSITORY) private readonly _institutionRepository: IInstitutionRepository,
                @inject(Identifier.LOGGER) readonly logger: ILogger) {
    }

    public async add(family: Family): Promise<Family> {
        FamilyValidator.validate(family)

        try {
            // Checks if family already exists
            const familyExist = await this._familyRepository.checkExist(family)
            if (familyExist) throw new ConflictException(Strings.FAMILY.ALREADY_REGISTERED)

            // Checks if the children to be associated have a record. Your registration is required.
            if (family.children) {
                const checkChildrenExist: boolean | ValidationException = await this._childRepository.checkExist(family.children)
                if (checkChildrenExist instanceof ValidationException) {
                    throw new ValidationException(
                        Strings.CHILD.CHILDREN_REGISTER_REQUIRED,
                        Strings.CHILD.IDS_WITHOUT_REGISTER.concat(' ').concat(checkChildrenExist.message)
                    )
                }
            }

            // Checks if the institution exists.
            if (family.institution && family.institution.id !== undefined) {
                const institutionExist = await this._institutionRepository.checkExist(family.institution)
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

        return this._familyRepository.create(family)
    }

    public async getAll(query: IQuery): Promise<Array<Family>> {
        query.addFilter({ type: UserType.FAMILY })
        return this._familyRepository.find(query)
    }

    public async getById(id: string | number, query: IQuery): Promise<Family> {
        query.addFilter({ _id: id, type: UserType.FAMILY })
        return this._familyRepository.findOne(query)
    }

    public async update(family: Family): Promise<Family> {
        try {
            // Checks if the children to be associated have a record. Your registration is required.
            if (family.children) {
                const checkChildrenExist: boolean | ValidationException = await this._childRepository.checkExist(family.children)
                if (checkChildrenExist instanceof ValidationException) {
                    throw new ValidationException(
                        Strings.CHILD.CHILDREN_REGISTER_REQUIRED,
                        Strings.CHILD.IDS_WITHOUT_REGISTER.concat(' ').concat(checkChildrenExist.message)
                    )
                }
            }

            // Checks if the institution exists.
            if (family.institution && family.institution.id !== undefined) {
                const institutionExist = await this._institutionRepository.checkExist(family.institution)
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
        return this._familyRepository.update(family)
    }

    public async remove(id: string | number): Promise<boolean> {
        return this._familyRepository.delete(id)
    }

    public async getAllChildren(familyId: string, query: IQuery): Promise<Array<Child> | undefined> {
        query.addFilter({ _id: familyId, type: UserType.FAMILY })

        try {
            const family: Family = await this._familyRepository.findOne(query)
            if (!family) return Promise.resolve(undefined)
            return Promise.resolve(family.children ? family.children : [])
        } catch (err) {
            return Promise.reject(err)
        }
    }

    public async associateChild(familyId: string, childId: string): Promise<Family | undefined> {
        const query: Query = new Query()
        query.filters = { _id: familyId, type: UserType.FAMILY }

        const child = new Child()
        child.id = childId

        try {
            const family: Family = await this._familyRepository.findOne(query)
            if (!family) return Promise.resolve(undefined)

            // Checks if the child to be associated have a record. Your registration is required.
            const checkChildExist: boolean | ValidationException = await this._childRepository.checkExist(child)
            if (!checkChildExist) {
                throw new ValidationException(Strings.CHILD.ASSOCIATION_FAILURE)
            }

            // verifies that the child is no longer associated
            if (family.children) {
                let childAlreadyExists = false
                await family.children.forEach(item => {
                    if (item.id === child.id) childAlreadyExists = true
                })

                if (childAlreadyExists) return Promise.resolve(family)
                family.children.push(child)
            }
            else family.children = new Array<Child>(child)

            return this._familyRepository.update(family)
        } catch (err) {
            return Promise.reject(err)
        }
    }

    public async disassociateChild(familyId: string, childId: string): Promise<boolean | undefined> {
        const query: Query = new Query()
        query.filters = { _id: familyId, type: UserType.FAMILY }

        try {
            const family: Family = await this._familyRepository.findOne(query)
            if (!family) return Promise.resolve(undefined)

            // verifies that the child is no longer associated
            if (family.children) {
                family.children = await family.children.filter(child => child.id !== childId)
                return await this._familyRepository.update(family) !== undefined
            }
            return await Promise.resolve(family) !== undefined
        } catch (err) {
            return Promise.reject(err)
        }
    }
}