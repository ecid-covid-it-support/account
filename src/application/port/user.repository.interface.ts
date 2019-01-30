import { User } from '../domain/model/user'
import { IRepository } from './repository.interface'

/**
 * Interface of the User repository.
 * Must be implemented by the user repository at the infrastructure layer.
 *
 * @see {@link UserRepository} for further information.
 * @extends {IRepository<User>}
 */
export interface IUserRepository extends IRepository<User> {
    /**
     * Change the user password.
     *
     * @param userId
     * @param old_password
     * @param new_password
     * @return {Promise<boolean>} True if the password was changed or False, otherwise.
     * @throws {ValidationException | RepositoryException}
     */
    changePassword(userId: string, old_password: string, new_password: string): Promise<boolean>

    /**
     * Encrypt the user password
     *
     * @param password
     * @return {string} Encrypted password if the encrypt was successfully.
     */
    encryptPassword(password: string): string

    /**
     * Compare if two passwords match.,
     *
     * @param passwordPlain
     * @param passwordHash
     * @return True if the passwords matches, false otherwise.
     */
    comparePasswords(passwordPlain: string, passwordHash: string): boolean

    /**
     * Disassociate user with institution
     *
     * @param id - Id of institution
     * @return True if the disassociate was successfully, false otherwise.
     *
     */
    disassociateInstitution(id: string): Promise<boolean>
}