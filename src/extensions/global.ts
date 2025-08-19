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


export {};
