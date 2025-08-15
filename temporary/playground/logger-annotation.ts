import { loggedClass, loggedMethod } from "../../src/annotations";
import { logger } from "../../src/logger";

@loggedClass({ logger, disallowedMethods: ["helperMethod"], includeStaticMethods: true })
class ExampleServiceForDemonstration {
  static performStaticPing(numberValue: number) {
    return numberValue + 1;
  }

  @loggedMethod({ logger })
  performComputation(firstNumber: number, secondNumber: number) {
		this.helperMethod();
    return firstNumber + secondNumber;
  }

  async fetchEntityByIdentifier(entityIdentifier: string) {
    return Promise.resolve({ entityIdentifier, status: "ok" });
  }

  private helperMethod() {
    console.log('helperMethod');
  }
}

(async function run() {
	const exampleServiceInstance = new ExampleServiceForDemonstration();
	ExampleServiceForDemonstration.performStaticPing(41);
	exampleServiceInstance.performComputation(1, 2);
	exampleServiceInstance.fetchEntityByIdentifier("abc");
	logger.ignoreException(new Error('My Ignored Exception'));
})();
