import HttpStatus from 'http-status-codes'
import { inject } from 'inversify'
import { controller, httpDelete, httpGet, httpPatch, httpPost, request, response } from 'inversify-express-utils'
import { Request, Response } from 'express'
import { Identifier } from '../../di/identifiers'
import { ApiExceptionManager } from '../exception/api.exception.manager'
import { Query } from '../../infrastructure/repository/query/query'
import { ApiException } from '../exception/api.exception'
import { ILogger } from '../../utils/custom.logger'
import { Strings } from '../../utils/strings'
import { IHealthProfessionalService } from '../../application/port/health.professional.service.interface'
import { HealthProfessional } from '../../application/domain/model/health.professional'
import { ChildrenGroup } from '../../application/domain/model/children.group'
import { IQuery } from '../../application/port/query.interface'
import { UserType } from '../../application/domain/model/user'

/**
 * Controller that implements Health Professional feature operations.
 *
 * @remarks To define paths, we use library inversify-express-utils.
 * @see {@link https://github.com/inversify/inversify-express-utils} for further information.
 */
@controller('/v1/healthprofessionals')
export class HealthProfessionalController {

    /**
     * Creates an instance of Health Professional controller.
     *
     * @param {IHealthProfessionalService} _healthProfessionalService
     * @param {ILogger} _logger
     */
    constructor(
        @inject(Identifier.HEALTH_PROFESSIONAL_SERVICE) private readonly _healthProfessionalService: IHealthProfessionalService,
        @inject(Identifier.LOGGER) readonly _logger: ILogger
    ) {
    }

    /**
     * Add new health professional.
     *
     * @param {Request} req
     * @param {Response} res
     */
    @httpPost('/')
    public async saveHealthProfessional(@request() req: Request, @response() res: Response): Promise<Response> {
        try {
            const healthProfessional: HealthProfessional = new HealthProfessional().fromJSON(req.body)
            healthProfessional.id = undefined
            const result: HealthProfessional = await this._healthProfessionalService.add(healthProfessional)
            return res.status(HttpStatus.CREATED).send(this.toJSONView(result))
        } catch (err) {
            const handlerError = ApiExceptionManager.build(err)
            return res.status(handlerError.code)
                .send(handlerError.toJSON())
        }
    }

    /**
     * Get all health professionals.
     * For the query strings, the query-strings-parser middleware was used.
     * @see {@link https://www.npmjs.com/package/query-strings-parser} for further information.
     *
     * @param {Request} req
     * @param {Response} res
     */
    @httpGet('/')
    public async getAllHealthProfessionals(@request() req: Request, @response() res: Response): Promise<Response> {
        try {
            const result: Array<HealthProfessional> = await this._healthProfessionalService
                .getAll(new Query().fromJSON(req.query))
            const count: number = await this._healthProfessionalService.count()
            res.setHeader('X-Total-Count', count)
            return res.status(HttpStatus.OK).send(this.toJSONView(result))
        } catch (err) {
            const handlerError = ApiExceptionManager.build(err)
            return res.status(handlerError.code)
                .send(handlerError.toJSON())
        }
    }

    /**
     * Get health professional by ID.
     * For the query strings, the query-strings-parser middleware was used.
     * @see {@link https://www.npmjs.com/package/query-strings-parser} for further information.
     *
     * @param {Request} req
     * @param {Response} res
     */
    @httpGet('/:healthprofessional_id')
    public async getHealthProfessionalById(@request() req: Request, @response() res: Response): Promise<Response> {
        try {
            const query: IQuery = new Query().fromJSON(req.query)
            query.addFilter({ _id: req.params.healthprofessional_id, type: UserType.HEALTH_PROFESSIONAL })
            const result: HealthProfessional = await this._healthProfessionalService
                .getById(req.params.healthprofessional_id, query)
            if (!result) return res.status(HttpStatus.NOT_FOUND).send(this.getMessageHealthProfessionalNotFound())
            return res.status(HttpStatus.OK).send(this.toJSONView(result))
        } catch (err) {
            const handlerError = ApiExceptionManager.build(err)
            return res.status(handlerError.code)
                .send(handlerError.toJSON())
        }
    }

    /**
     * Update health professional by ID.
     *
     * @param {Request} req
     * @param {Response} res
     */
    @httpPatch('/:healthprofessional_id')
    public async updateHealthProfessionalById(@request() req: Request, @response() res: Response): Promise<Response> {
        try {
            const healthProfessional: HealthProfessional = new HealthProfessional().fromJSON(req.body)
            healthProfessional.id = req.params.healthprofessional_id
            // Ignore last_login attributes if exists.
            healthProfessional.last_login = undefined
            const result: HealthProfessional | undefined = await this._healthProfessionalService.update(healthProfessional)
            if (!result) return res.status(HttpStatus.NOT_FOUND).send(this.getMessageHealthProfessionalNotFound())
            return res.status(HttpStatus.OK).send(this.toJSONView(result))
        } catch (err) {
            const handlerError = ApiExceptionManager.build(err)
            return res.status(handlerError.code)
                .send(handlerError.toJSON())
        }
    }

    /**
     *  Register a children group from health professional.
     *
     * @param {Request} req
     * @param {Response} res
     */
    @httpPost('/:healthprofessional_id/children/groups')
    public async saveChildrenGroupFromHealthProfessional(@request() req: Request, @response() res: Response): Promise<Response> {
        try {
            const childrenGroup: ChildrenGroup = new ChildrenGroup().fromJSON(req.body)
            childrenGroup.id = undefined
            // Creates a health professional to associate with the group of children
            const healthProfessional: HealthProfessional = new HealthProfessional()
            healthProfessional.id = req.params.healthprofessional_id
            childrenGroup.user = healthProfessional

            const result: ChildrenGroup = await this._healthProfessionalService
                .saveChildrenGroup(req.params.healthprofessional_id, childrenGroup)
            return res.status(HttpStatus.CREATED).send(this.toJSONChildrenGroupView(result))
        } catch (err) {
            const handlerError = ApiExceptionManager.build(err)
            return res.status(handlerError.code)
                .send(handlerError.toJSON())
        }
    }

    /**
     * Recovers all groups of children associated with an health professional.
     * For the query strings, the query-strings-parser middleware was used.
     * @see {@link https://www.npmjs.com/package/query-strings-parser} for further information.
     *
     * @param {Request} req
     * @param {Response} res
     */
    @httpGet('/:healthprofessional_id/children/groups')
    public async getAllChildrenGroupFromHealthProfessional(@request() req: Request, @response() res: Response):
        Promise<Response> {

        try {
            const query: IQuery = new Query().fromJSON(req.query)
            query.addFilter({ user_id: req.params.healthprofessional_id })
            const result: Array<ChildrenGroup> = await this._healthProfessionalService
                .getAllChildrenGroups(req.params.healthprofessional_id, query)
            const count: number = await this._healthProfessionalService.countChildrenGroups(req.params.healthprofessional_id)
            res.setHeader('X-Total-Count', count)
            return res.status(HttpStatus.OK).send(this.toJSONChildrenGroupView(result))
        } catch (err) {
            const handlerError = ApiExceptionManager.build(err)
            return res.status(handlerError.code)
                .send(handlerError.toJSON())
        }
    }

    /**
     * Recovers children group data from health professional.
     *
     * @param {Request} req
     * @param {Response} res
     */
    @httpGet('/:healthprofessional_id/children/groups/:group_id')
    public async getChildrenGroupFromHealthProfessionalById(@request() req: Request, @response() res: Response):
        Promise<Response> {

        try {
            const query: IQuery = new Query().fromJSON(req.query)
            query.filters = { _id: req.params.group_id }
            const result: ChildrenGroup | undefined = await this._healthProfessionalService
                .getChildrenGroupById(req.params.healthprofessional_id, req.params.group_id, query)
            if (!result) return res.status(HttpStatus.NOT_FOUND).send(this.getMessageChildrenGroupNotFound())
            return res.status(HttpStatus.OK).send(this.toJSONChildrenGroupView(result))
        } catch (err) {
            const handlerError = ApiExceptionManager.build(err)
            return res.status(handlerError.code)
                .send(handlerError.toJSON())
        }
    }

    /**
     * Update children group data from health professional.
     *
     * @param {Request} req
     * @param {Response} res
     */
    @httpPatch('/:healthprofessional_id/children/groups/:group_id')
    public async updateChildrenGroupFromHealthProfessional(@request() req: Request, @response() res: Response):
        Promise<Response> {
        try {
            const childrenGroup: ChildrenGroup = new ChildrenGroup().fromJSON(req.body)
            childrenGroup.id = req.params.group_id
            // Creates a health professional to associate with the group of children
            const healthProfessional: HealthProfessional = new HealthProfessional()
            healthProfessional.id = req.params.healthprofessional_id
            childrenGroup.user = healthProfessional

            const result: ChildrenGroup | undefined = await this._healthProfessionalService
                .updateChildrenGroup(req.params.healthprofessional_id, childrenGroup)
            if (!result) return res.status(HttpStatus.NOT_FOUND).send(this.getMessageChildrenGroupNotFound())
            return res.status(HttpStatus.OK).send(this.toJSONChildrenGroupView(result))
        } catch (err) {
            const handlerError = ApiExceptionManager.build(err)
            return res.status(handlerError.code)
                .send(handlerError.toJSON())
        }
    }

    /**
     * Disassociate a child from a health professional.
     *
     * @param {Request} req
     * @param {Response} res
     */
    @httpDelete('/:healthprofessional_id/children/groups/:group_id')
    public async disassociateChildFromHealthProfessional(@request() req: Request, @response() res: Response):
        Promise<Response> {
        try {
            await this._healthProfessionalService.deleteChildrenGroup(req.params.healthprofessional_id, req.params.group_id)
            return res.status(HttpStatus.NO_CONTENT).send()
        } catch (err) {
            const handlerError = ApiExceptionManager.build(err)
            return res.status(handlerError.code)
                .send(handlerError.toJSON())
        }
    }

    /**
     * Convert object to json format expected by view.
     *
     * @param healthProfessional
     */
    private toJSONView(healthProfessional: HealthProfessional | Array<HealthProfessional>): object {
        if (healthProfessional instanceof Array) {
            return healthProfessional.map(item => {
                item.type = undefined
                return item.toJSON()
            })
        }
        healthProfessional.type = undefined
        return healthProfessional.toJSON()
    }

    /**
     * Convert Children Group to json format expected by view.
     *
     * @param childrenGroup
     */
    private toJSONChildrenGroupView(childrenGroup: ChildrenGroup | Array<ChildrenGroup>): object {
        if (childrenGroup instanceof Array) {
            return childrenGroup.map(item => item.toJSON())
        }
        return childrenGroup.toJSON()
    }

    /**
     * Default message when resource is not found or does not exist.
     */
    private getMessageHealthProfessionalNotFound(): object {
        return new ApiException(
            HttpStatus.NOT_FOUND,
            Strings.HEALTH_PROFESSIONAL.NOT_FOUND,
            Strings.HEALTH_PROFESSIONAL.NOT_FOUND_DESCRIPTION
        ).toJSON()
    }

    /**
     * Default message when resource children group is not found or does not exist.
     */
    private getMessageChildrenGroupNotFound(): object {
        return new ApiException(
            HttpStatus.NOT_FOUND,
            Strings.CHILDREN_GROUP.NOT_FOUND,
            Strings.CHILDREN_GROUP.NOT_FOUND_DESCRIPTION
        ).toJSON()
    }
}
