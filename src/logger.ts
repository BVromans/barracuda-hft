
/**
 * Centralized, singleton application logger.
 */
export class Logger {
	/**
	 * Singleton instance
	 */
	private static instance: Logger;

	/**
	 * Constructor
	 */
	private constructor() {
	}

	/**
	 * Returns the singleton, initializing on first call.
	 */
	public static getInstance(): Logger {
		if (!Logger.instance) {
			Logger.instance = new Logger();
		}

		return Logger.instance;
	}

	/**
	 * Ignore an exception
	 * @param exception - The exception to ignore
	 * @param message - The message to log
	 */
	public ignoreException(exception: any, message?: string): void {
		message = message || 'Ignored exception: ';
		if (exception instanceof Error) {
			message += `\n${exception.message}\n${exception.stack}`;
		} else {
			message += exception;
		}

		console.warn(message);
	}
}

/**
 * Singleton instance of logger
 */
export const logger = Logger.getInstance();
