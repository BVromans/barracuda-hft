// noinspection JSUnusedGlobalSymbols

import { List, Map } from "immutable";
import { properties } from "./properties";
import Decimal from "decimal.js";

/**
 * Get a value or a default value if the value is undefined or null.
 * @template R - The type of the value.
 * @template NSV - The type of the default value.
 * @param value - The value to get.
 * @param defaultValue - The default value to return if the value is undefined or null.
 * @returns The value or the default value.
 * @throws An error if the value is undefined or null and no default value is provided.
 */
export const get = <R>(value: any, defaultValue?: R): R => {
	if (value === undefined || value === null) {
		if (defaultValue === undefined || defaultValue === null) {
			throw new Error('Value is null or undefined and no default value provided');
		}

		return defaultValue as R;
	}

	return value as R;
};

export const getIn = <K, V>(target: List<V> | Map<K, V>, key: K | string | Array<K | string>, defaultValue?: V, getAsRawKey?: boolean): V => {
	if (key === undefined || key === null) {
		if (defaultValue === undefined || defaultValue === null) {
			throw new Error('Value is null or undefined and no default value provided');
		}

		return defaultValue as V;
	}

	if (Array.isArray(key)) {
		return target.getIn(key, defaultValue) as V;
	}

	if (typeof key === 'string' && !getAsRawKey) {
		const path = key.trim().split('.');
		if (path.length === 1) {
			return target.get(path[0] as any, defaultValue) as V;
		}

		return target.getIn(path, defaultValue) as V;
	}

	const value = target.get(key as any, defaultValue) as V;

	if (value === undefined) {
		throw new Error(`Value not found for key: ${key}`);
	}

	return value;
};

/**
 *
 * @param milliseconds
 */
export const sleep = (milliseconds: number) =>
	new Promise((callback) => setTimeout(callback, milliseconds));

/**
 *
 * @param task
 * @param interval
 */
export const runAndRepeat = async (task: (...args: any[]) => any | Promise<any>, interval: number): Promise<NodeJS.Timeout> => {
	await task();

	const intervalId = setInterval(task, interval);

	return intervalId;
};

/**
 * Same as Promise.all(items.map(item => task(item))), but it waits for
 * the first {batchSize} promises to finish before starting the next batch.
 *
 * @template A
 * @template B
 * @param {function(A): B} task The task to run for each item.
 * @param {A[]} items Arguments to pass to the task for each call.
 * @param {int} batchSize The number of items to process at a time.
 * @param {int} delayBetweenBatches Delay between each batch (milliseconds).
 * @returns {B[]}
 */
export const promiseAllInBatches = async <I, O>(
	task: (item: I) => Promise<O>,
	items: any[],
	batchSize: number = properties.getAs<number>('rujira.default.parallel.batchSize'),
	delayBetweenBatches: number = properties.getAs<number>('rujira.default.parallel.delayBetweenBatches'),
): Promise<O[]> => {
	let position = 0;
	let results: any[] = [];

	if (!batchSize) {
		batchSize = items.length;
	}

	while (position < items.length) {
		const itemsForBatch = items.slice(position, position + batchSize);
		results = [
			...results,
			...(await Promise.all(itemsForBatch.map((item) => task(item)))),
		];
		position += batchSize;

		if (position < items.length) {
			if (delayBetweenBatches > 0) {
				await sleep(delayBetweenBatches);
			}
		}
	}

	return results;
};

export function* splitInChunks<T>(
	target: T[],
	quantity: number,
): Generator<T[], void> {
	for (let i = 0; i < target.length; i += quantity) {
		yield target.slice(i, i + quantity);
	}
}

/**
 * Decorator that wraps a method with retry and timeout logic.
 *
 * @param options.maxRetries         Maximum number of retries (default: 3)
 * @param options.delayBetweenRetries Delay (in seconds) between retries (default: 1)
 * @param options.timeout            Total allowed time (in seconds) for the operation (default: 60)
 * @param options.timeoutMessage     Error message in case of timeout (default: 'Timeout exceeded.')
 */
export function runWithRetryAndTimeout(options?: {
	maximumNumberOfRetries?: number;
	delayBetweenRetries?: number;
	timeout?: number;
	timeoutErrorMessage?: string;
}): MethodDecorator {
	const {
		maximumNumberOfRetries = properties.getAs<number>('rujira.default.retry.maximumNumberOfRetries'),
		delayBetweenRetries = properties.getAs<number>('rujira.default.retry.delayBetweenRetries'),
		timeout = properties.getAs<number>('rujira.default.retry.timeout'),
		timeoutErrorMessage = 'Timeout exceeded.',
	} = options || {};
	return function (
		target: Object,
		propertyKey: string | symbol,
		descriptor: PropertyDescriptor,
	): PropertyDescriptor {
		const originalMethod = descriptor.value;
		if (typeof originalMethod !== 'function') {
			throw new Error('Decorator can only be applied to methods');
		}

		// Replace the original method with one that incorporates retry and timeout logic.
		descriptor.value = async function (...args: any[]): Promise<any> {
			const sleep = (ms: number): Promise<void> =>
				new Promise<void>((resolve) => setTimeout(resolve, Math.floor(ms)));

			// Function that performs the retries.
			const callWithRetries = async (): Promise<any> => {
				const errors: Error[] = [];

				for (let attempt = 0; attempt < maximumNumberOfRetries; attempt++) {
					try {
						// Execute the original method with correct binding.
						// noinspection UnnecessaryLocalVariableJS
						const result = await originalMethod.apply(this, args);

						return result;
					} catch (error: any) {
						errors.push(error);
						console.debug(
							`${(target as any).constructor.name}.${String(propertyKey)} => attempt ${attempt + 1} of ${maximumNumberOfRetries} failed`,
						);

						// Wait before retrying if there are remaining attempts.
						if (attempt < maximumNumberOfRetries - 1 && delayBetweenRetries > 0) {
							await sleep(delayBetweenRetries * 1000);
						}
					}
				}
				// Aggregate all error messages.
				const aggregatedErrors = errors.map((err) => err.message).join(';\n');
				throw new Error(
					`Failed to execute "${String(propertyKey)}" after ${maximumNumberOfRetries} retries. Errors:\n${aggregatedErrors}`,
				);
			};

			// Race the retry logic against a timeout promise if timeout is set.
			if (timeout > 0) {
				return await Promise.race([
					callWithRetries(),
					new Promise((_, reject) =>
						setTimeout(
							() => reject(new Error(timeoutErrorMessage)),
							Math.floor(timeout * 1000),
						),
					),
				]);
			} else {
				return await callWithRetries();
			}
		};

		return descriptor;
	};
}

/**
 * Replacer for JSON.stringify to handle special cases.
 * @param key - The key of the value.
 * @param value - The value to replace.
 * @returns The replaced value.
 */
const jsonReplacer = (key: string, value: any) => {
	if (value instanceof Decimal) {
		return value.toString();
	} else if (value instanceof BigInt) {
		return value.toString();
	} else if (value instanceof Date) {
		return value.toISOString();
	} else if (value instanceof List) {
		return (value as List<any>).toJS();
	} else if (value instanceof Map) {
		return (value as Map<any, any>).toJS();
	} else if (value.toString) {
		return value.toString();
	}

	return value;
};

/**
 * Dump the target to the console.
 * @param target - The target to dump.
 */
export const dump = (target: any) => {
	try {
		console.log(JSON.stringify(target, jsonReplacer, 2));
	} catch (exception) {
		console.log(target);
	}
};
