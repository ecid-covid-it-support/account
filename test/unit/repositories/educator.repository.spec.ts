import sinon from 'sinon'
import { UserType } from '../../../src/application/domain/model/user'
import { Educator } from '../../../src/application/domain/model/educator'
import { UserRepoModel } from '../../../src/infrastructure/database/schema/user.schema'
import { EducatorRepository } from '../../../src/infrastructure/repository/educator.repository'
import { EntityMapperMock } from '../../mocks/entity.mapper.mock'
import { CustomLoggerMock } from '../../mocks/custom.logger.mock'
import { UserRepository } from '../../../src/infrastructure/repository/user.repository'
import { assert } from 'chai'
import { ObjectID } from 'bson'
import { EducatorMock } from '../../mocks/educator.mock'

require('sinon-mongoose')

describe('Repositories: Educator', () => {

    const defaultEducator: Educator = new EducatorMock()
    defaultEducator.id = '507f1f77bcf86cd799439011'
    defaultEducator.password = 'userpass'

    // Mock educator array
    const educatorsArr: Array<Educator> = new Array<EducatorMock>()
    for (let i = 0; i < 3; i++) {
        educatorsArr.push(new EducatorMock())
    }

    const modelFake: any = UserRepoModel
    const userRepo = new UserRepository(modelFake, new EntityMapperMock(), new CustomLoggerMock())
    const educatorRepo = new EducatorRepository(modelFake, new EntityMapperMock(), userRepo, new CustomLoggerMock())

    // Mock query
    const queryMock: any = {
        toJSON: () => {
            return {
                fields: {},
                ordination: {},
                pagination: { page: 1, limit: 100, skip: 0 },
                filters: { _id: defaultEducator.id, type: UserType.EDUCATOR }
            }
        }
    }

    afterEach(() => {
        sinon.restore()
    })

    describe('create(item: Educator)', () => {

        context('when a database error occurs', () => {
            it('should throw a RepositoryException', () => {
                sinon
                    .mock(modelFake)
                    .expects('create')
                    .withArgs(defaultEducator)
                    .chain('exec')
                    .rejects({ message: 'An internal error has occurred in the database!',
                               description: 'Please try again later...' })

                return educatorRepo.create(defaultEducator)
                    .catch(err => {
                        assert.propertyVal(err, 'message', 'An internal error has occurred in the database!')
                        assert.propertyVal(err, 'description', 'Please try again later...')
                    })
            })
        })
    })

    describe('find(query: IQuery)', () => {
        context('when there is at least one educator that corresponds to the received parameters', () => {
            it('should return an Educator array', () => {
                sinon
                    .mock(modelFake)
                    .expects('find')
                    .withArgs(queryMock.toJSON().filters)
                    .chain('exec')
                    .resolves(educatorsArr)

                return educatorRepo.find(queryMock)
                    .then(result => {
                        assert(result, 'result must not be undefined')
                        assert.isArray(result)
                        assert.isNotEmpty(result)
                    })
            })
        })

        context('when there is at least one educator that corresponds to the received parameters (with a parameter to the ' +
            'populate (fields))', () => {
            it('should return an Educator array', () => {
                const customQueryMock: any = {
                    toJSON: () => {
                        return {
                            fields: { 'institution.id': defaultEducator.institution!.id },
                            ordination: {},
                            pagination: { page: 1, limit: 100, skip: 0 },
                            filters: { _id: defaultEducator.id, type: UserType.EDUCATOR }
                        }
                    }
                }

                sinon
                    .mock(modelFake)
                    .expects('find')
                    .withArgs(customQueryMock.toJSON().filters)
                    .chain('exec')
                    .resolves(educatorsArr)

                return educatorRepo.find(customQueryMock)
                    .then(result => {
                        assert(result, 'result must not be undefined')
                        assert.isArray(result)
                        assert.isNotEmpty(result)
                    })
            })
        })

        context('when there is no educator that corresponds to the received parameters', () => {
            it('should return an empty array', () => {
                queryMock.filters = { _id: '507f1f77bcf86cd799439012', type: UserType.EDUCATOR }
                sinon
                    .mock(modelFake)
                    .expects('find')
                    .withArgs(queryMock.toJSON().filters)
                    .chain('exec')
                    .resolves(new Array<EducatorMock>())

                return educatorRepo.find(queryMock)
                    .then(result => {
                        assert(result, 'result must not be undefined')
                        assert.isArray(result)
                        assert.isEmpty(result)
                    })
            })
        })

        context('when a database error occurs', () => {
            it('should throw a RepositoryException', () => {
                queryMock.filters = { _id: '123', type: UserType.EDUCATOR }

                sinon
                    .mock(modelFake)
                    .expects('find')
                    .withArgs(queryMock.toJSON().filters)
                    .chain('exec')
                    .rejects({ message: 'An internal error has occurred in the database!',
                               description: 'Please try again later...' })

                return educatorRepo.find(queryMock)
                    .catch(err => {
                        assert.propertyVal(err, 'message', 'An internal error has occurred in the database!')
                        assert.propertyVal(err, 'description', 'Please try again later...')
                    })
            })
        })
    })

    describe('findOne(query: IQuery)', () => {
        context('when there is an educator that corresponds to the received parameters', () => {
            it('should return the Educator that was found', () => {
                queryMock.filters = { _id: defaultEducator.id, type: UserType.EDUCATOR }

                sinon
                    .mock(modelFake)
                    .expects('findOne')
                    .withArgs(queryMock.toJSON().filters)
                    .chain('exec')
                    .resolves(defaultEducator)

                return educatorRepo.findOne(queryMock)
                    .then(result => {
                        assert.propertyVal(result, 'id', defaultEducator.id)
                        assert.propertyVal(result, 'username', defaultEducator.username)
                        assert.propertyVal(result, 'type', defaultEducator.type)
                        assert.propertyVal(result, 'scopes', defaultEducator.scopes)
                        assert.propertyVal(result, 'institution', defaultEducator.institution)
                        assert.propertyVal(result, 'children_groups', defaultEducator.children_groups)
                    })
            })
        })

        context('when there is an educator that corresponds to the received parameters (with a parameter to the ' +
            'populate (fields))', () => {
            it('should return the Educator that was found', () => {
                const customQueryMock: any = {
                    toJSON: () => {
                        return {
                            fields: { 'institution.id': defaultEducator.institution!.id },
                            ordination: {},
                            pagination: { page: 1, limit: 100, skip: 0 },
                            filters: { _id: defaultEducator.id, type: UserType.EDUCATOR }
                        }
                    }
                }

                sinon
                    .mock(modelFake)
                    .expects('findOne')
                    .withArgs(customQueryMock.toJSON().filters)
                    .chain('exec')
                    .resolves(defaultEducator)

                return educatorRepo.findOne(customQueryMock)
                    .then(result => {
                        assert.propertyVal(result, 'id', defaultEducator.id)
                        assert.propertyVal(result, 'username', defaultEducator.username)
                        assert.propertyVal(result, 'type', defaultEducator.type)
                        assert.propertyVal(result, 'scopes', defaultEducator.scopes)
                        assert.propertyVal(result, 'institution', defaultEducator.institution)
                        assert.propertyVal(result, 'children_groups', defaultEducator.children_groups)
                    })
            })
        })

        context('when there is no educator that corresponds to the received parameters', () => {
            it('should return undefined', () => {
                queryMock.filters = { _id: '507f1f77bcf86cd799439012', type: UserType.EDUCATOR }

                sinon
                    .mock(modelFake)
                    .expects('findOne')
                    .withArgs(queryMock.toJSON().filters)
                    .chain('exec')
                    .resolves(undefined)

                return educatorRepo.findOne(queryMock)
                    .then(result => {
                        assert.isUndefined(result)
                    })
            })
        })

        context('when a database error occurs', () => {
            it('should throw a RepositoryException', () => {
                queryMock.filters = { _id: '', type: UserType.EDUCATOR }

                sinon
                    .mock(modelFake)
                    .expects('findOne')
                    .withArgs(queryMock.toJSON().filters)
                    .chain('exec')
                    .rejects({ message: 'An internal error has occurred in the database!',
                               description: 'Please try again later...' })

                return educatorRepo.findOne(queryMock)
                    .catch(err => {
                        assert.propertyVal(err, 'message', 'An internal error has occurred in the database!')
                        assert.propertyVal(err, 'description', 'Please try again later...')
                    })
            })
        })
    })

    describe('update(item: Educator)', () => {
        context('when the educator exists in the database', () => {
            it('should return the updated educator', () => {
                sinon
                    .mock(modelFake)
                    .expects('findOneAndUpdate')
                    .withArgs({ _id: defaultEducator.id }, defaultEducator, { new: true })
                    .chain('exec')
                    .resolves(defaultEducator)

                return educatorRepo.update(defaultEducator)
                    .then(result => {
                        assert.propertyVal(result, 'id', defaultEducator.id)
                        assert.propertyVal(result, 'username', defaultEducator.username)
                        assert.propertyVal(result, 'type', defaultEducator.type)
                        assert.propertyVal(result, 'scopes', defaultEducator.scopes)
                        assert.propertyVal(result, 'institution', defaultEducator.institution)
                        assert.propertyVal(result, 'children_groups', defaultEducator.children_groups)
                    })
            })
        })

        context('when the educator is not found', () => {
            it('should return undefined', () => {

                sinon
                    .mock(modelFake)
                    .expects('findOneAndUpdate')
                    .withArgs({ _id: defaultEducator.id }, defaultEducator, { new: true })
                    .chain('exec')
                    .resolves(undefined)

                return educatorRepo.update(defaultEducator)
                    .then((result: any) => {
                        assert.isUndefined(result)
                    })
            })
        })

        context('when a database error occurs', () => {
            it('should throw a RepositoryException', () => {

                defaultEducator.id = ''

                sinon
                    .mock(modelFake)
                    .expects('findOneAndUpdate')
                    .withArgs({ _id: defaultEducator.id }, defaultEducator, { new: true })
                    .chain('exec')
                    .rejects({ message: 'An internal error has occurred in the database!',
                               description: 'Please try again later...' })

                return educatorRepo.update(defaultEducator)
                    .catch((err) => {
                        assert.propertyVal(err, 'message', 'An internal error has occurred in the database!')
                        assert.propertyVal(err, 'description', 'Please try again later...')
                    })
            })
        })
    })

    describe('findById(educatorId: string)', () => {
        context('when there is an educator that corresponds to the received parameters', () => {
            it('should return the Educator that was found', () => {
                defaultEducator.id = '507f1f77bcf86cd799439011'
                queryMock.filters = { _id: defaultEducator.id, type: UserType.EDUCATOR }

                sinon
                    .mock(modelFake)
                    .expects('findOne')
                    .withArgs(queryMock.toJSON().filters)
                    .chain('exec')
                    .resolves(defaultEducator)

                return educatorRepo.findById(defaultEducator.id!)
                    .then(result => {
                        assert.propertyVal(result, 'id', defaultEducator.id)
                        assert.propertyVal(result, 'username', defaultEducator.username)
                        assert.propertyVal(result, 'type', defaultEducator.type)
                        assert.propertyVal(result, 'scopes', defaultEducator.scopes)
                        assert.propertyVal(result, 'institution', defaultEducator.institution)
                        assert.propertyVal(result, 'children_groups', defaultEducator.children_groups)
                    })
            })
        })

        context('when there is an educator that corresponds to the received parameters (with a parameter to the ' +
            'populate (fields))', () => {
            it('should return the Educator that was found', () => {
                const customQueryMock: any = {
                    toJSON: () => {
                        return {
                            fields: { 'institution.id': defaultEducator.institution!.id },
                            ordination: {},
                            pagination: { page: 1, limit: 100, skip: 0 },
                            filters: { _id: defaultEducator.id, type: UserType.EDUCATOR }
                        }
                    }
                }

                sinon
                    .mock(modelFake)
                    .expects('findOne')
                    .withArgs(customQueryMock.toJSON().filters)
                    .chain('exec')
                    .resolves(defaultEducator)

                return educatorRepo.findById(defaultEducator.id!)
                    .then(result => {
                        assert.propertyVal(result, 'id', defaultEducator.id)
                        assert.propertyVal(result, 'username', defaultEducator.username)
                        assert.propertyVal(result, 'type', defaultEducator.type)
                        assert.propertyVal(result, 'scopes', defaultEducator.scopes)
                        assert.propertyVal(result, 'institution', defaultEducator.institution)
                        assert.propertyVal(result, 'children_groups', defaultEducator.children_groups)
                    })
            })
        })

        context('when there is no educator that corresponds to the received parameters', () => {
            it('should return undefined', () => {
                queryMock.filters = { _id: '507f1f77bcf86cd799439012', type: UserType.EDUCATOR }

                sinon
                    .mock(modelFake)
                    .expects('findOne')
                    .withArgs(queryMock.toJSON().filters)
                    .chain('exec')
                    .resolves(undefined)

                return educatorRepo.findById(defaultEducator.id!)
                    .then(result => {
                        assert.isUndefined(result)
                    })
            })
        })

        context('when a database error occurs', () => {
            it('should throw a RepositoryException', () => {
                defaultEducator.id = ''
                queryMock.filters = { _id: '', type: UserType.EDUCATOR }

                sinon
                    .mock(modelFake)
                    .expects('findOne')
                    .withArgs(queryMock.toJSON().filters)
                    .chain('exec')
                    .rejects({ message: 'An internal error has occurred in the database!',
                               description: 'Please try again later...' })

                return educatorRepo.findById(defaultEducator.id!)
                    .catch(err => {
                        assert.propertyVal(err, 'message', 'An internal error has occurred in the database!')
                        assert.propertyVal(err, 'description', 'Please try again later...')
                    })
            })
        })
    })

    describe('checkExists()', () => {
        context('when there is an educator with the id used', () => {
            it('should return true if exists in search by id', () => {
                defaultEducator.id = '507f1f77bcf86cd799439011'
                queryMock.filters = { _id: defaultEducator.id, type: UserType.EDUCATOR }
                sinon
                    .mock(modelFake)
                    .expects('findOne')
                    .withArgs(queryMock.toJSON().filters)
                    .chain('exec')
                    .resolves(defaultEducator)

                return educatorRepo.checkExist(defaultEducator)
                    .then(result => {
                        assert.isBoolean(result)
                        assert.isTrue(result)
                    })
            })
        })

        context('when the username is used as the search filter', () => {
            it('should return true if exists in search by username', () => {
                const customQueryMock: any = {
                    toJSON: () => {
                        return {
                            fields: {},
                            ordination: {},
                            pagination: { page: 1, limit: 100, skip: 0 },
                            filters: { username: defaultEducator.username, type: UserType.EDUCATOR }
                        }
                    }
                }

                const educatorWithoutId = new Educator()
                educatorWithoutId.username = defaultEducator.username
                educatorWithoutId.type = defaultEducator.type

                sinon
                    .mock(modelFake)
                    .expects('findOne')
                    .withArgs(customQueryMock.toJSON().filters)
                    .chain('exec')
                    .resolves(defaultEducator)

                return educatorRepo.checkExist(educatorWithoutId)
                    .then(result => {
                        assert.isBoolean(result)
                        assert.isTrue(result)
                    })
            })
        })

        context('when educator is not found', () => {
            it('should return false', () => {
                const customEducator = new Educator()
                customEducator.id = `${new ObjectID()}`
                customEducator.type = UserType.EDUCATOR

                const customQueryMock: any = {
                    toJSON: () => {
                        return {
                            fields: {},
                            ordination: {},
                            pagination: { page: 1, limit: 100, skip: 0 },
                            filters: { _id: customEducator.id, type: UserType.EDUCATOR }
                        }
                    }
                }

                sinon
                    .mock(modelFake)
                    .expects('findOne')
                    .withArgs(customQueryMock.toJSON().filters)
                    .chain('exec')
                    .resolves(undefined)

                return educatorRepo.checkExist(customEducator)
                    .then(result => {
                        assert.isBoolean(result)
                        assert.isFalse(result)
                    })
            })
        })

        context('when a database error occurs', () => {
            it('should throw a RepositoryException', () => {
                defaultEducator.id = ''
                queryMock.filters = { _id: defaultEducator.id, type: UserType.EDUCATOR }

                sinon
                    .mock(modelFake)
                    .expects('findOne')
                    .withArgs(queryMock.toJSON().filters)
                    .chain('exec')
                    .rejects({
                        message: 'An internal error has occurred in the database!',
                        description: 'Please try again later...'
                    })

                return educatorRepo.checkExist(defaultEducator)
                    .catch(err => {
                        assert.propertyVal(err, 'message', 'An internal error has occurred in the database!')
                        assert.propertyVal(err, 'description', 'Please try again later...')
                    })
            })
        })
    })
})