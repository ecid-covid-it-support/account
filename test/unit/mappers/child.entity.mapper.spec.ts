import { assert } from 'chai'
import { Child } from '../../../src/application/domain/model/child'
import { ChildMock } from '../../mocks/child.mock'
import { ChildEntityMapper } from '../../../src/infrastructure/entity/mapper/child.entity.mapper'

describe('Mappers: ChildEntity', () => {
    const child: Child = new ChildMock()

    // Create child JSON
    const childJSON: any = {
        id: '77388a5c901305e367c5e660',
        type: 'child',
        scopes: [
            'children:read',
            'institutions:read',
            'questionnaires:create',
            'questionnaires:read',
            'foodrecord:create',
            'foodrecord:read',
            'physicalactivities:create',
            'physicalactivities:read',
            'sleep:create',
            'sleep:read',
            'environment:read',
            'missions:read',
            'gamificationprofile:read',
            'gamificationprofile:update'
        ],
        username: 'child_mock',
        institution: {
            id: '273ab3632f16bbd9044753cb',
            type: 'Institute of Scientific Research',
            name: 'Name Example',
            address: '221B Baker Street, St.',
            latitude: 57.972946525983005,
            longitude: 15.984903991931109
        },
        gender: 'male',
        age: 6
    }

    describe('transform(item: any)', () => {
        context('when the parameter is of type Child', () => {
            it('should normally execute the method, returning a ChildEntity as a result of the transformation', () => {
                const result = new ChildEntityMapper().transform(child)
                assert.propertyVal(result, 'id', child.id)
                assert.propertyVal(result, 'username', child.username)
                assert.propertyVal(result, 'type', child.type)
                assert.propertyVal(result, 'scopes', child.scopes)
                assert.propertyVal(result, 'institution', child.institution!.id)
                assert.propertyVal(result, 'gender', child.gender)
                assert.propertyVal(result, 'age', child.age)
            })
        })

        context('when the parameter is a JSON', () => {
            it('should not normally execute the method, returning a Child as a result of the transformation', () => {
                const result = new ChildEntityMapper().transform(childJSON)
                assert.propertyVal(result, 'id', childJSON.id)
                assert.propertyVal(result, 'username', childJSON.username)
                assert.propertyVal(result, 'type', childJSON.type)
                assert.propertyVal(result, 'scopes', childJSON.scopes)
                assert.property(result, 'institution')
                assert.propertyVal(result, 'gender', childJSON.gender)
                assert.propertyVal(result, 'age', childJSON.age)
            })
        })

        context('when the parameter is a JSON without an institution', () => {
            it('should not normally execute the method, returning a Child as a result of the transformation', () => {
                childJSON.institution = null
                const result = new ChildEntityMapper().transform(childJSON)
                assert.propertyVal(result, 'id', childJSON.id)
                assert.propertyVal(result, 'username', childJSON.username)
                assert.propertyVal(result, 'type', childJSON.type)
                assert.propertyVal(result, 'scopes', childJSON.scopes)
                assert.isUndefined(result.institution)
                assert.propertyVal(result, 'gender', childJSON.gender)
                assert.propertyVal(result, 'age', childJSON.age)
            })
        })

        context('when the parameter is a undefined', () => {
            it('should not normally execute the method, returning a Child as a result of the transformation', () => {
                const result = new ChildEntityMapper().transform(undefined)

                assert.isObject(result)
                assert.propertyVal(result, 'id', undefined)
                assert.propertyVal(result, 'username', undefined)
                assert.propertyVal(result, 'institution', undefined)
                assert.propertyVal(result, 'gender', undefined)
                assert.propertyVal(result, 'age', undefined)
            })
        })
    })
})