import { loggedClass, loggedMethod } from "../../src/annotations";
import { logger } from "../../src/logger";

@loggedClass({
	logger,
	disallowedMethods: ["helperMethod"],
	includeStaticMethods: true,
	// class-level flags (can be overridden per method)
	logStart: true,
	logEnd: true,
	logInput: false,
	logOutput: true,
})
class ExampleServiceForDemonstration {
	static performStaticPing(numberValue: number) {
		return numberValue + 1;
	}

	@loggedMethod({ logger, logInput: true, logOutput: false })
	performComputation(firstNumber: number, secondNumber: number) {
		this.helperMethod();
		return firstNumber + secondNumber;
	}

	@loggedMethod({ logger, logStart: true, logEnd: true, logInput: true, logOutput: true })
	async fetchEntityByIdentifier(entityIdentifier: string) {
		return Promise.resolve({ entityIdentifier, status: "ok" });
	}

	private helperMethod() {
		logger.debug('helperMethod invoked');
	}
}

(async function run() {
	const exampleServiceInstance = new ExampleServiceForDemonstration();
	ExampleServiceForDemonstration.performStaticPing(41);
	exampleServiceInstance.performComputation(1, 2);
	exampleServiceInstance.fetchEntityByIdentifier("abc");
	logger.ignoreException(new Error('My Ignored Exception'));
})();
