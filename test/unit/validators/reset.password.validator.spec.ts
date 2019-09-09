import { assert } from 'chai'
import { ResetPasswordValidator } from '../../../src/application/domain/validator/reset.password.validator'

describe('Validators: UpdatePassword', () => {
    context('when the validation was successful', () => {
        it('should return undefined', () => {
            const result = ResetPasswordValidator.validate('newpass')
            assert.equal(result, undefined)
        })
    })

    context('when does not pass new password', () => {
        it('should throw an error for does not pass old password', () => {
            try {
                ResetPasswordValidator.validate('')
            } catch (err) {
                assert.equal(err.message, 'Required field not provided...')
                assert.equal(err.description, 'Reset password validation failed: new_password is required!')
            }
        })
    })
})
