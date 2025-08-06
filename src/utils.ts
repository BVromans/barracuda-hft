// noinspection JSUnusedGlobalSymbols

import { properties } from "./properties";

/**
 *
 * @param value
 * @param errorMessage
 */
export const getOrThrow = <R>(
	value?: any,
	errorMessage: string = 'Value is null or undefined',
): R => {
	if (value === undefined || value === null) throw new Error(errorMessage);

	return value as R;
};

/**
 *
 * @param value
 * @param defaultValue
 */
export const getOrDefault = <R>(value: any, defaultValue: R): R => {
	if (value === undefined || value === null) return defaultValue;

	return value as R;
};

/**
 *
 * @param milliseconds
 */
export const sleep = (milliseconds: number) =>
	new Promise((callback) => setTimeout(callback, milliseconds));

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
