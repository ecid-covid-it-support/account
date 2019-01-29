import { injectable } from 'inversify'
import { IEntityMapper } from '../../port/entity.mapper.interface'
import { Institution } from '../../../application/domain/model/institution'
import { ChildrenGroup } from '../../../application/domain/model/children.group'
import { HealthProfessional } from '../../../application/domain/model/health.professional'
import { HealthProfessionalEntity } from '../health.professional.entity'

@injectable()
export class HealthProfessionalEntityMapper implements IEntityMapper<HealthProfessional, HealthProfessionalEntity> {
    public transform(item: any): any {
        if (item instanceof HealthProfessional) return this.modelToModelEntity(item)
        return this.jsonToModel(item) // json
    }

    /**
     * Convert {HealthProfessional} for {HealthProfessionalEntity}.
     *
     * @see Creation Date should not be mapped to the type the repository understands.
     * Because this attribute is created automatically by the database.
     * Therefore, if a null value is passed at update time, an exception is thrown.
     * @param item
     */
    public modelToModelEntity(item: HealthProfessional): HealthProfessionalEntity {
        const result: HealthProfessionalEntity = new HealthProfessionalEntity()
        if (item.id) result.id = item.id
        if (item.username) result.username = item.username
        if (item.password) result.password = item.password
        if (item.type) result.type = item.type
        if (item.institution) result.institution = item.institution.id
        if (item.children_groups) {
            const childrenGroupsTemp: Array<string> = []
            item.children_groups.forEach(elem => {
                if (elem.id) childrenGroupsTemp.push(elem.id)
            })
            result.children_groups = childrenGroupsTemp
        }

        return result
    }

    /**
     * Convert {HealthProfessionalEntity} for {HealthProfessional}.
     *
     * @see Each attribute must be mapped only if it contains an assigned value,
     * because at some point the attribute accessed may not exist.
     * @param item
     */
    public modelEntityToModel(item: HealthProfessionalEntity): HealthProfessional {
        throw Error('Not implemented!')
    }

    /**
     * Convert JSON for {HealthProfessional}.
     *
     * @see Each attribute must be mapped only if it contains an assigned value,
     * because at some point the attribute accessed may not exist.
     * @param json
     */
    public jsonToModel(json: any): HealthProfessional {
        const result: HealthProfessional = new HealthProfessional()
        if (!json) return result

        if (json.id !== undefined) result.id = json.id
        if (json.username !== undefined) result.username = json.username
        if (json.password !== undefined) result.password = json.password
        if (json.type !== undefined) result.type = json.type
        if (json.institution !== undefined) {
            if (json.institution === null) result.institution = undefined
            else result.institution = new Institution().fromJSON(json.institution)
        }
        if (json.children_groups !== undefined) {
            result.children_groups = json.children_groups.map(item => new ChildrenGroup().fromJSON(item))
        }

        return result
    }
}