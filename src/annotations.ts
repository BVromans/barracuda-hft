function valueLooksLikeAPromise(value: unknown): value is Promise<unknown> {
	return !!value && typeof (value as any).then === "function" && typeof (value as any).catch === "function";
}

function getBestEffortCallerStack(stackSkipCount: number = 2): string | undefined {
	const errorObject = new Error();
	const stackAny: any = (errorObject as any).stack;

	return stackAny.slice(stackSkipCount);
}

function getBestEffortCallerStackFrame(stackSkipCount: number = 2): any {
	const errorObject = new Error();
	const stackAny: any = (errorObject as any).stack;

	return stackAny[stackSkipCount] ?? stackAny[stackAny.length - 1] ?? undefined
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

function formatDurationMilliseconds(totalMilliseconds: number): string {
	const hours = Math.floor(totalMilliseconds / 3600000);
	const minutes = Math.floor((totalMilliseconds % 3600000) / 60000);
	const seconds = Math.floor((totalMilliseconds % 60000) / 1000);
	const milliseconds = Math.floor(totalMilliseconds % 1000);
	const two = (n: number) => String(n).padStart(2, "0");
	const three = (n: number) => String(n).padStart(3, "0");
	return `${two(hours)}:${two(minutes)}:${two(seconds)}.${three(milliseconds)}`;
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
	// Toggle which parts of the lifecycle are logged
	logStart?: boolean; // default: true
	logEnd?: boolean; // default: true (applies to both success and exception)
	logInput?: boolean; // default: true (method arguments)
	logOutput?: boolean; // default: true (method return value on success)
	logExecutionTime?: boolean; // default: false (include total execution time in end messages)
};

export function loggedMethod(options?: LoggedMethodDecoratorOptions): MethodDecorator;
export function loggedMethod(targetObject: Object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<any>): TypedPropertyDescriptor<any> | void;
export function loggedMethod(
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
					const flags = {
						logStart: optionsObject?.logStart ?? true,
						logEnd: optionsObject?.logEnd ?? true,
						logInput: optionsObject?.logInput ?? true,
						logOutput: optionsObject?.logOutput ?? true,
						logExecutionTime: optionsObject?.logExecutionTime ?? false,
					};

					const startTimestampMs = Date.now();

					if (flags.logStart) {
						const extra: any[] = [];
						if (flags.logInput) extra.push({ arguments: argumentsList });
						const stack = getBestEffortCallerStack(2);
						loggerInstance.debug(
							`Starting ${fullyQualifiedMethodName}...`,
							stack,
							false,
							...extra,
						);
					}

					try {
						const resultValue = originalMethod.apply(this, argumentsList);

						if (valueLooksLikeAPromise(resultValue)) {
							return (resultValue as Promise<unknown>)
								.then((resolvedValue) => {
									if (flags.logEnd) {
										const elapsedMs = Date.now() - startTimestampMs;
										const durationText = flags.logExecutionTime ? ` (duration: ${formatDurationMilliseconds(elapsedMs)})` : "";
										const extra: any[] = [];
										if (flags.logOutput) extra.push({ result: resolvedValue });
										const stack = getBestEffortCallerStack(2);
										loggerInstance.debug(
											`Successfully executed ${fullyQualifiedMethodName}.${durationText}`,
											stack,
											false,
											...extra,
										);
									}
									return resolvedValue;
								})
								.catch((exceptionObject) => {
									const formattedExceptionText = formatExceptionForLogging(exceptionObject);
									if (flags.logEnd) {
										const elapsedMs = Date.now() - startTimestampMs;
										const durationText = flags.logExecutionTime ? ` (duration: ${formatDurationMilliseconds(elapsedMs)})` : "";
										const stack = getBestEffortCallerStack(2);
										loggerInstance.debug(
											`Exception raised in ${fullyQualifiedMethodName}${durationText}: ${String(exceptionObject)}\n${formattedExceptionText}`,
											stack,
											false,
											{},
										);
									}
									throw exceptionObject;
								});
						} else {
							if (flags.logEnd) {
								const elapsedMs = Date.now() - startTimestampMs;
								const durationText = flags.logExecutionTime ? ` (duration: ${formatDurationMilliseconds(elapsedMs)})` : "";
								const extra: any[] = [];
								if (flags.logOutput) extra.push({ result: resultValue });
								const stack = getBestEffortCallerStack(2);
								loggerInstance.debug(
									`Successfully executed ${fullyQualifiedMethodName}.${durationText}`,
									stack,
									false,
									...extra,
								);
							}
							return resultValue;
						}
					} catch (exceptionObject) {
						const formattedExceptionText = formatExceptionForLogging(exceptionObject);
						if (flags.logEnd) {
							const elapsedMs = Date.now() - startTimestampMs;
							const durationText = flags.logExecutionTime ? ` (duration: ${formatDurationMilliseconds(elapsedMs)})` : "";
							const stack = getBestEffortCallerStack(2);
							loggerInstance.debug(
								`Exception raised in ${fullyQualifiedMethodName}${durationText}: ${String(exceptionObject)}\n${formattedExceptionText}`,
								stack,
								false,
								{},
							);
						}
						throw exceptionObject;
					}
				};

				(descriptor as TypedPropertyDescriptor<any>).value = wrappedMethod as any;
				return descriptor;
			};

	if (typeof secondArgument === "string" || typeof secondArgument === "symbol") {
		// Bare usage: @loggedMethod
		return createDecorator()(firstArgument as Object, secondArgument, thirdArgument!);
	}

	// Usage with options: @loggedMethod
	return createDecorator(firstArgument as LoggedMethodDecoratorOptions);
}

type LoggedClassDecoratorOptions = {
	logger?: LoggerLike;
	allowedMethods?: string[];
	disallowedMethods?: string[];
	includeStaticMethods?: boolean;
	// Optional logging flags that will be forwarded to each method's decorator
	logStart?: boolean;
	logEnd?: boolean;
	logInput?: boolean;
	logOutput?: boolean;
	logExecutionTime?: boolean;
};

export function loggedClass(options?: LoggedClassDecoratorOptions): ClassDecorator;
export function loggedClass<TConstructorFunction extends Function>(constructorFunction: TConstructorFunction): void | TConstructorFunction;
export function loggedClass(argument?: any): any {
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

			const methodDecorator = loggedMethod({
				logger: loggerInstance,
				logStart: options?.logStart,
				logEnd: options?.logEnd,
				logInput: options?.logInput,
				logOutput: options?.logOutput,
				logExecutionTime: (options as any)?.logExecutionTime,
			}) as MethodDecorator;
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
		// Bare usage: @loggedClass
		return applyDecoratorToClass(argument);
	}

	const optionsObject = argument as LoggedClassDecoratorOptions | undefined;
	return function (constructorFunction: any) {
		return applyDecoratorToClass(constructorFunction, optionsObject);
	};
}
