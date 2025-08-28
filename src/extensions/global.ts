import Decimal from "decimal.js";
import { List } from "immutable";

/**
 * Extend the global scope for TS type checking.
 */
declare global {
	/**
	 * Probe a promise to debug it.
	 * @param p - The promise to probe.
	 */
	var probe: <T>(p: Promise<T>) => void;

	/**
	 * Dump an object to the console.
	 * @param target - The object to dump.
	 */
	var dump: (target: any) => void;

	/**
	 * A test variable to store the result of the promise.
	 */
	var $debug: unknown;
}

/**
 * Probe a promise to debug it.
 * @param promise - The promise to probe.
 */
globalThis.probe = <T>(promise: Promise<T>): void => {
	Promise.resolve(promise).then(
		(value) => {
			globalThis.$debug = value;
			console.log('$debug\n', globalThis.$debug);
			debugger;
		},
		(error) => {
			globalThis.$debug = error;
			console.log('$debug\n', globalThis.$debug);
			debugger;
		}
	);
};

// myAsyncFunction()
// .then((result) => { globalThis.$debug = result; console.log('$debug\n', globalThis.$debug); debugger; })
// .catch((error) => { globalThis.$debug = error; console.log('$debug\n', globalThis.$debug); debugger; });

// void (async () => {
// 	let result;
// 	try {
// 		result = await myAsyncFunction();
// 	} catch (error) {
// 		result = error;
// 	}
// 	globalThis.$debug = result;
// 	console.log('$debug\n', globalThis.$debug);
// 	debugger;
// })();

// queueMicrotask(async () => {
// 	let result;
// 	try {
// 		result = await myAsyncFunction();
// 	} catch (error) {
// 		result = error;
// 	}
// 	globalThis.$debug = result;
// 	console.log('$debug\n', globalThis.$debug);
// 	debugger;
// });

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
			const object: any = {
				// __class__: prototype.constructor.name
			};
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
globalThis.dump = (target: any) => {
	try {
		return JSON.stringify(target, jsonReplacer, 2);
	} catch (exception) {
		return target;
	}
};


export { };
