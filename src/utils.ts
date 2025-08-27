// noinspection JSUnusedGlobalSymbols

import { List, Map } from "immutable";
import { properties } from "./properties";
import Decimal from "decimal.js";

/**
 * Get a value or a default value if the value is undefined or null.
 * @template R - The type of the value.
 * @param value - The value to get.
 * @param defaultValue - The default value to return if the value is undefined or null.
 * @returns The value or the default value.
 * @throws An error if the value is undefined or null and no default value is provided.
 */
export const get = <R>(value: any, defaultValue?: R, errorMessage?: string): R => {
	if (value === undefined || value === null) {
		if (defaultValue === undefined || defaultValue === null) {
			throw new Error(errorMessage || 'Value is null or undefined and no default value provided');
		}

		return defaultValue as R;
	}

	return value as R;
};

/**
 * Get a value from a nested object.
 * @template K - The type of the key.
 * @template V - The type of the value.
 * @param target - The target object.
 * @param key - The key to get.
 * @param defaultValue - The default value to return if the value is undefined or null.
 * @param getAsRawKey - Whether to get the key as a raw key.
 * @returns The value or the default value.
 * @throws An error if the value is undefined or null and no default value is provided.
 */
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

	if (value === undefined || value === null) {
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
	if (interval === undefined || interval === null || interval <= 0 || isNaN(interval)) {
		throw new Error('Interval is not defined or is not a positive number');
	}

	await task();

	const intervalId = setInterval(task, Number(interval));

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

/**
 * Split an array into chunks.
 * @template T - The type of the items.
 * @param target - The target array.
 * @param quantity - The quantity of items per chunk.
 * @returns A generator of chunks.
 */
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
 * Dump a value to the console.
 * @param value - The value to dump.
 */
export const dump = globalThis.dump;

/**
 * Sanitize the order price.
 * @param price - The price to sanitize.
 * @param tick - The tick of the market (max significant digits).
 * @returns The sanitized price.
 */
export const sanitizeOrderPrice = (price: Decimal, tick: number, maximumPrecision: number = 12): Decimal => {
	const priceString = price.toFixed(maximumPrecision).trim().replace(/^0+/g, '').replace(/0+$/g, '');
	let [ integerPartString, fractionalPartString ] = priceString.split('.');
	integerPartString = integerPartString || '0';

	if (integerPartString !== '0') {
		if (integerPartString.length > tick) {
			throw new Error(`Order price must have at most ${tick} non-zero leading digits because of the market tick. Got: ${price.toFixed()}`);
		}

		const result = Decimal(`${integerPartString}.${fractionalPartString.slice(0, tick - integerPartString.length)}`);

		return result;
	} else {
		const fractionalPartStringLeadingZeros = fractionalPartString.replace(/(0*)([^0]+)$/g, '$1');
		const fractionalPartStringWithoutLeadingZeros = fractionalPartString.replace(/^0+/g, '');

		const result = `0.${fractionalPartStringLeadingZeros}${fractionalPartStringWithoutLeadingZeros.slice(0, tick)}`;

		return new Decimal(result);
	}
};

/**
 * Validate the order price.
 * @param price - The price to validate.
 * @param tick - The tick of the market.
 * @returns The validated price.
 * @throws An error if the price has more than the allowed number of non-zero leading digits because of the market tick.
 */
export const validateOrderPrice = (price?: Decimal, tick?: number | string): boolean => {
	if (!price || !tick?.toString().trim()) {
		return false;
	}

	if (!price.gt(Decimal(0))) {
		throw new Error(`Order price must be greater than 0. Got: ${price}`);
	}

	tick = Number(tick?.toString().trim());

	const significantPriceDigitsString = price.toFixed().replace(/^0+\.?0*/g, '').replace(/0+$/g, '').replace('.', '');
	if (significantPriceDigitsString.length > tick) {
		throw new Error(`Order price must have at most ${tick} non-zero leading digits because of the market tick. Got: ${price.toFixed()}`);
	}

	return true;
}
