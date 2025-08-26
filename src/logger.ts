import Decimal from "decimal.js";
import { List, Map } from "immutable";
import * as fs from "fs";
import * as path from "path";

/**
 * Replacer for JSON.stringify to handle special cases.
 * @param key - The key of the value.
 * @param value - The value to replace.
 * @returns The replaced value.
 */
const jsonReplacer = (key: string, value: any) => {
	if (value instanceof Decimal) {
		return value.toFixed();
	}
	if (typeof value === "bigint") {
		return value.toString();
	}
	if (value instanceof Date) {
		return value.toISOString();
	}
	if (value instanceof List || value instanceof Map) {
		return (value as any).toJS();
	}
	if (typeof value === "function") {
		return `[Function: ${value.name || "anonymous"}]`;
	}
	if (typeof value === "symbol") {
		return value.toString();
	}
	if (typeof value === "object" && value !== null) {
		// Handle plain objects and class instances
		const prototype = Object.getPrototypeOf(value);
		if (prototype && prototype !== Object.prototype) {
			// For class instances, include class name
			const object: any = { __class__: prototype.constructor.name };
			for (const property in value) {
				if (Object.prototype.hasOwnProperty.call(value, property)) {
					object[property] = value[property];
				}
			}
			return object;
		} else {
			const object: any = {};
			for (const property in value) {
				if (Object.prototype.hasOwnProperty.call(value, property)) {
					object[property] = jsonReplacer(property, value[property]);
				}
			}
			return object;
		}
	}
	return value;
};

/**
 * Dump the target to the console.
 * @param target - The target to dump.
 */
const dump = (target: any) => {
	try {
		return JSON.stringify(target, jsonReplacer, 2);
	} catch (exception) {
		return target;
	}
};

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
	 * Log directory path
	 */
	private readonly logDirectory: string;

	/**
	 * Constructor
	 */
	private constructor() {
		this.logDirectory = path.join(process.cwd(), "log");
		this.ensureLogDirectoryExists();
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
	 * Ensures the log directory exists, creating it if necessary
	 */
	private ensureLogDirectoryExists(): void {
		if (!fs.existsSync(this.logDirectory)) {
			fs.mkdirSync(this.logDirectory, { recursive: true });
		}
	}

	/**
	 * Writes a message to a specific log file
	 * @param filename - The name of the log file
	 * @param message - The message to write
	 */
	private writeToLogFile(filename: string, message: string): void {
		try {
			const filePath = path.join(this.logDirectory, filename);
			fs.appendFileSync(filePath, message, 'utf8');
		} catch (error) {
			// Fallback to console if file writing fails
			console.error(`Failed to write to log file ${filename}:`, error);
		}
	}

	/**
	 * Log a debug message
	 * @param message - The message to log
	 */
	public debug(message: string, object?: any, ...optionalParams: any[]): void {
		this.log(LogLevel.DEBUG, message, object, ...optionalParams);
	}

	/**
	 * Log an information
	 * @param message - The message to log
	 */
	public info(message: string, object?: any, ...optionalParams: any[]): void {
		this.log(LogLevel.INFO, message, object, ...optionalParams);
	}

	/**
	 * Log a warning
	 * @param message - The message to log
	 */
	public warning(message: string, object?: any, ...optionalParams: any[]): void {
		this.log(LogLevel.WARNING, message, object, ...optionalParams);
	}

	/**
	 * Log an error
	 * @param message - The message to log
	 */
	public error(message: string, object?: any, ...optionalParams: any[]): void {
		this.log(LogLevel.ERROR, message, object, ...optionalParams);
	}

	/**
	 * Log a critical message
	 * @param message - The message to log
	 */
	public critical(message: string, object?: any, ...optionalParams: any[]): void {
		this.log(LogLevel.CRITICAL, message, object, ...optionalParams);
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

		this.log(LogLevel.WARNING, message, undefined, new Error().stack as any);
	}

	/**
	 * Log a message
	 * @param message - The message to log
	 */
	private log(level: LogLevel, message: string, object?: any, stack?: any, includeStackTrace?: boolean, ...optionalParams: any[]): void {
		const now = new Date();
		const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

		let frame: any | undefined;
		let stacktrace: string | undefined = undefined;
		if (!stack) {
			stack = new Error().stack as any;
			frame = stack[2];
			stacktrace = stack?.slice(2).map((frame: any) => frame.string).join('\n');
		} else {
			frame = stack[0];
			stacktrace = stack?.map((frame: any) => frame.string).join('\n');
		}

		const filePath = frame?.fileName;
		const lineNumber = frame?.lineNumber;
		const columnNumber = frame?.columnNumber;
		const functionName = frame?.functionName;
		const methodName = frame?.methodName;

		message = `\n[${timestamp}][${level.toUpperCase()}][${filePath}:${lineNumber}:${columnNumber}][${functionName || methodName}]: ${message}${includeStackTrace ? `\n\n${stacktrace}` : ''}\n`;

		let method: 'debug' | 'info' | 'warn' | 'error' = 'debug';

		if (level === LogLevel.DEBUG) {
			method = 'debug';
		} else if (level === LogLevel.INFO) {
			method = 'info';
		} else if (level === LogLevel.WARNING) {
			method = 'warn';
		} else if (level === LogLevel.ERROR) {
			method = 'error';
		} else if (level === LogLevel.CRITICAL) {
			method = 'error';
		}

		if (object) {
			if (optionalParams.length > 0) {
				console[method](message, dump(object), dump(optionalParams));
			} else {
				console[method](message, dump(object));
			}
		} else if (optionalParams.length > 0) {
			console[method](message, dump(optionalParams));
		} else {
			console[method](message);
		}

		this.writeToLogFile("all.log", message);

		this.writeToLogFile(`${level}.log`, message);
	}
}

/**
 * Singleton instance of logger
 */
export const logger = Logger.getInstance();
