/**
 * Class that defines variables with default values.
 *
 * @see Variables defined in .env will have preference.
 * @see Be careful not to put critical data in this file as it is not in .gitignore.
 * Sensitive data such as database, passwords and keys should be stored in secure locations.
 *
 * @abstract
 */
export abstract class Default {
    public static readonly APP_TITLE: string = 'Account Service'
    public static readonly APP_ID: string = 'account_service'
    public static readonly APP_DESCRIPTION: string = 'Micro-service for Account.'
    public static readonly NODE_ENV: string = 'development' // development, test, production
    public static readonly PORT_HTTP: number = 5000
    public static readonly PORT_HTTPS: number = 5001
    public static readonly SWAGGER_PATH: string = './src/ui/swagger/api.yaml'

    // MongoDB
    public static readonly MONGODB_URI: string = 'mongodb://127.0.0.1:27017/account-service'
    public static readonly MONGODB_URI_TEST: string = 'mongodb://127.0.0.1:27017/account-service-test'
    public static readonly MONGODB_CON_RETRY_COUNT: number = 0 // infinite
    public static readonly MONGODB_CON_RETRY_INTERVAL: number = 1000 // 1s

    // RabbitMQ
    public static readonly RABBITMQ_AMQP_URI: string = 'amqp://127.0.0.1:5672'
    public static readonly RABBITMQ_EXCHANGE_NAME: string = 'account-service'
    public static readonly RABBITMQ_QUEUE_NAME: string = 'account_queue'
    public static readonly RABBITMQ_CON_RETRY_COUNT: number = 0 // infinite
    public static readonly RABBITMQ_CON_RETRY_INTERVAL: number = 1000 // 1s

    // Log
    public static readonly LOG_DIR: string = 'logs'
}