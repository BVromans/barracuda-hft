Error.prepareStackTrace = (err, stack) => {
	return stack.map(callSite => {
		// getThis	this value of the function call
		// getTypeName	typeof this
		// getFunction	function object
		// getFunctionName	function name as a string
		// getMethodName	method name as a string
		// getFileName	file name or URL
		// getLineNumber	line number
		// getColumnNumber	column number
		// getEvalOrigin	undefined
		// getScriptNameOrSourceURL	source URL
		// isToplevel	returns true if the function is in the global scope
		// isEval	returns true if the function is an eval call
		// isNative	returns true if the function is native
		// isConstructor	returns true if the function is a constructor
		// isAsync	returns true if the function is async
		// isPromiseAll	Not implemented yet.
		// getPromiseIndex	Not implemented yet.
		// toString
		const result = {
			this: callSite.getThis(),
			typeName: callSite.getTypeName(),
			function: callSite.getFunction(),
			functionName: callSite.getFunctionName(),
			methodName: callSite.getMethodName(),
			fileName: callSite.getFileName(),
			lineNumber: callSite.getLineNumber(),
			columnNumber: callSite.getColumnNumber(),
			evalOrigin: callSite.getEvalOrigin(),
			scriptNameOrSourceURL: callSite.getScriptNameOrSourceURL(),
			isToplevel: callSite.isToplevel(),
			isEval: callSite.isEval(),
			isNative: callSite.isNative(),
			isConstructor: callSite.isConstructor(),
			isAsync: callSite.isAsync(),
			isPromiseAll: callSite.isPromiseAll(),
			promiseIndex: callSite.getPromiseIndex(),
			string: callSite.toString(),
		}

		return result;
	});
};


/**
 * Log levels
 */
export enum LogLevel {
	DEBUG = 'debug',
	INFO = 'info',
	WARNING = 'warning',
	ERROR = 'error',
	CRITICAL = 'critical',
}

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
	 * Log a debug message
	 * @param message - The message to log
	 */
	public debug(message: string, ...optionalParams: any[]): void {
		this.log(LogLevel.DEBUG, message, ...optionalParams);
	}

	/**
	 * Log an information
	 * @param message - The message to log
	 */
	public info(message: string, ...optionalParams: any[]): void {
		this.log(LogLevel.INFO, message, ...optionalParams);
	}

	/**
	 * Log a warning
	 * @param message - The message to log
	 */
	public warning(message: string, ...optionalParams: any[]): void {
		this.log(LogLevel.WARNING, message, ...optionalParams);
	}

	/**
	 * Log an error
	 * @param message - The message to log
	 */
	public error(message: string, ...optionalParams: any[]): void {
		this.log(LogLevel.ERROR, message, ...optionalParams);
	}

	/**
	 * Log a critical message
	 * @param message - The message to log
	 */
	public critical(message: string, ...optionalParams: any[]): void {
		this.log(LogLevel.CRITICAL, message, ...optionalParams);
	}

	/**
	 * Ignore an exception
	 * @param exception - The exception to ignore
	 * @param message - The message to log
	 */
	public ignoreException(exception: any, message?: string): void {
		message = message || 'Ignored exception:';
		if (exception instanceof Error) {
			message += ` ${exception.message}`;
		} else {
			message += exception;
		}

		this.log(LogLevel.WARNING, message);
	}

	/**
	 * Log a message
	 * @param message - The message to log
	 */
	private log(level: LogLevel, message: string, ...optionalParams: any[]): void {
		const timestamp = new Date().toISOString();
		const stack = new Error().stack as any;
		const frame = stack[2];
		const filePath = frame.fileName;
		const lineNumber = frame.lineNumber;
		const columnNumber = frame.columnNumber;
		const functionName = frame.functionName;
		const methodName = frame.methodName;

		const stacktrace = stack.slice(2).map((frame: any) => frame.string).join('\n');

		message = `[${timestamp}][${level}][${filePath}:${lineNumber}:${columnNumber}][${functionName || methodName}]: ${message}\n\n${stacktrace}`;

		if (level === LogLevel.DEBUG) {
			console.debug(message, ...optionalParams);
		} else if (level === LogLevel.INFO) {
			console.info(message, ...optionalParams);
		} else if (level === LogLevel.WARNING) {
			console.warn(message, ...optionalParams);
		} else if (level === LogLevel.ERROR) {
			console.error(message, ...optionalParams);
		} else if (level === LogLevel.CRITICAL) {
			console.error(message, ...optionalParams);
		}
	}
}

/**
 * Singleton instance of logger
 */
export const logger = Logger.getInstance();
