// logging_decorators.ts
// Main implementation (no demo code here)

function valueLooksLikeAPromise(value: unknown): value is Promise<unknown> {
	return !!value && typeof (value as any).then === "function" && typeof (value as any).catch === "function";
}

function getBestEffortCallerStackFrame(stackSkipCount: number = 2): string | undefined {
	const errorObject = new Error();
	const stackAny: any = (errorObject as any).stack;

	// Support both default string stack traces and the custom structured stack used by this project
	if (Array.isArray(stackAny)) {
		const frame = stackAny[stackSkipCount] ?? stackAny[stackAny.length - 1];
		if (!frame) return undefined;
		if (typeof frame.string === "string") return frame.string;
		const file = frame.fileName ?? "";
		const line = frame.lineNumber != null ? `:${frame.lineNumber}` : "";
		const col = frame.columnNumber != null ? `:${frame.columnNumber}` : "";
		return `${file}${line}${col}`;
	}

	const stackText = String(stackAny ?? "");
	const stackLines = stackText.split("\n").map((line) => line.trim());
	return stackLines[stackSkipCount] ?? stackLines[stackLines.length - 1] ?? undefined;
}

function formatExceptionForLogging(exceptionValue: unknown): string {
	if (exceptionValue instanceof Error) {
		return exceptionValue.stack ?? `${exceptionValue.name}: ${exceptionValue.message}`;
	}
	try {
		return JSON.stringify(exceptionValue);
	} catch {
		return String(exceptionValue);
	}
}

function getClassNameFromTarget(targetObject: any): string {
	if (targetObject && typeof targetObject === "function") {
		return targetObject.name || "AnonymousClass";
	}
	if (targetObject?.constructor?.name) {
		return targetObject.constructor.name;
	}
	return "AnonymousClass";
}

function buildFullyQualifiedMethodName(targetObject: any, propertyKey: string | symbol): string {
	const className = getClassNameFromTarget(
		typeof targetObject === "function" ? targetObject : targetObject?.constructor
	);
	return `${className}.${String(propertyKey)}`;
}

type LoggerLike = {
	debug(messageText: string, ...args: any[]): void;
};

type LoggedMethodDecoratorOptions = {
	logger?: LoggerLike;
};

export function logged_method(options?: LoggedMethodDecoratorOptions): MethodDecorator;
export function logged_method(targetObject: Object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<any>): TypedPropertyDescriptor<any> | void;
export function logged_method(
	firstArgument: any,
	secondArgument?: any,
	thirdArgument?: any
): any {
	const createDecorator =
		(optionsObject?: LoggedMethodDecoratorOptions): MethodDecorator =>
			(targetObject: any, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<any>) => {
				const loggerInstance =
					optionsObject?.logger ??
					// Assumes there is a concrete global or imported logger object available in your project
					(globalThis as any).logger as LoggerLike;

				if (!loggerInstance || typeof loggerInstance.debug !== "function") {
					throw new Error(
						"Logger instance with a 'debug' method was not found. Provide one via options or ensure a global 'logger' exists."
					);
				}

				const originalMethod = (descriptor as TypedPropertyDescriptor<any>).value as Function;
				if (typeof originalMethod !== "function") return;

				const fullyQualifiedMethodName = buildFullyQualifiedMethodName(targetObject, propertyKey);

				const wrappedMethod = function (this: any, ...argumentsList: any[]) {
					const callerFrame = getBestEffortCallerStackFrame(2);

					loggerInstance.debug(
						`Starting ${fullyQualifiedMethodName}...`,
						undefined,
						{ arguments: argumentsList },
						// callerFrame
					);

					try {
						const resultValue = originalMethod.apply(this, argumentsList);

						if (valueLooksLikeAPromise(resultValue)) {
							return (resultValue as Promise<unknown>)
								.then((resolvedValue) => {
									loggerInstance.debug(
										`Successfully executed ${fullyQualifiedMethodName}.`,
										undefined,
										{ result: resolvedValue },
										// callerFrame
									);
									return resolvedValue;
								})
								.catch((exceptionObject) => {
									const formattedExceptionText = formatExceptionForLogging(exceptionObject);
									loggerInstance.debug(
										`Exception raised in ${fullyQualifiedMethodName}: ${String(exceptionObject)}\n${formattedExceptionText}`,
										undefined,
										{},
										// callerFrame
									);
									throw exceptionObject;
								});
						} else {
							loggerInstance.debug(
								`Successfully executed ${fullyQualifiedMethodName}.`,
								undefined,
								{ result: resultValue },
								// callerFrame
							);
							return resultValue;
						}
					} catch (exceptionObject) {
						const formattedExceptionText = formatExceptionForLogging(exceptionObject);
						loggerInstance.debug(
							`Exception raised in ${fullyQualifiedMethodName}: ${String(exceptionObject)}\n${formattedExceptionText}`,
							undefined,
							{},
							// callerFrame
						);
						throw exceptionObject;
					}
				};

				(descriptor as TypedPropertyDescriptor<any>).value = wrappedMethod as any;
				return descriptor;
			};

	if (typeof secondArgument === "string" || typeof secondArgument === "symbol") {
		// Bare usage: @logged_method
		return createDecorator()(firstArgument as Object, secondArgument, thirdArgument!);
	}

	// Usage with options: @logged_method({ logger })
	return createDecorator(firstArgument as LoggedMethodDecoratorOptions);
}

type LoggedClassDecoratorOptions = {
	logger?: LoggerLike;
	allowedMethods?: string[];
	disallowedMethods?: string[];
	includeStaticMethods?: boolean;
};

export function logged_class(options?: LoggedClassDecoratorOptions): ClassDecorator;
export function logged_class<TConstructorFunction extends Function>(constructorFunction: TConstructorFunction): void | TConstructorFunction;
export function logged_class(argument?: any): any {
	const applyDecoratorToClass = (constructorFunction: any, options?: LoggedClassDecoratorOptions) => {
		const loggerInstance =
			options?.logger ??
			// Assumes there is a concrete global or imported logger object available in your project
			(globalThis as any).logger;

		if (!loggerInstance || typeof loggerInstance.debug !== "function") {
			throw new Error(
				"Logger instance with a 'debug' method was not found. Provide one via options or ensure a global 'logger' exists."
			);
		}

		const allowedMethodSet =
			options?.allowedMethods && options.allowedMethods.length > 0
				? new Set(options.allowedMethods)
				: undefined;

		const disallowedMethodSet =
			options?.disallowedMethods && options.disallowedMethods.length > 0
				? new Set(options.disallowedMethods)
				: undefined;

		const shouldIncludeStaticMethods = options?.includeStaticMethods ?? true;

		const wrapSingleMethodIfEligible = (hostObject: any, methodName: string) => {
			if (methodName === "constructor") return;

			if (disallowedMethodSet && disallowedMethodSet.has(methodName)) return;
			if (allowedMethodSet && !allowedMethodSet.has(methodName)) return;

			const propertyDescriptor = Object.getOwnPropertyDescriptor(hostObject, methodName);
			if (!propertyDescriptor) return;

			const isAccessor = typeof propertyDescriptor.get === "function" || typeof propertyDescriptor.set === "function";
			if (isAccessor) return;

			if (typeof propertyDescriptor.value !== "function") return;

			const methodDecorator = logged_method({ logger: loggerInstance }) as MethodDecorator;
			methodDecorator(hostObject, methodName, propertyDescriptor);
			Object.defineProperty(hostObject, methodName, propertyDescriptor);
		};

		// Instance methods
		for (const methodName of Object.getOwnPropertyNames(constructorFunction.prototype)) {
			wrapSingleMethodIfEligible(constructorFunction.prototype, methodName);
		}

		// Static methods (optional)
		if (shouldIncludeStaticMethods) {
			for (const staticName of Object.getOwnPropertyNames(constructorFunction)) {
				if (staticName === "length" || staticName === "name" || staticName === "prototype") continue;
				wrapSingleMethodIfEligible(constructorFunction, staticName);
			}
		}

		return constructorFunction;
	};

	if (typeof argument === "function") {
		// Bare usage: @logged_class
		return applyDecoratorToClass(argument);
	}

	const optionsObject = argument as LoggedClassDecoratorOptions | undefined;
	return function (constructorFunction: any) {
		return applyDecoratorToClass(constructorFunction, optionsObject);
	};
}
