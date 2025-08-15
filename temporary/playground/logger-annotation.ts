import { logged_class, logged_method } from "../../src/annotations";
import { logger } from "../../src/logger";

@logged_class({ logger, disallowedMethods: ["helperMethod"], includeStaticMethods: true })
class ExampleServiceForDemonstration {
  static performStaticPing(numberValue: number) {
    return numberValue + 1;
  }

  @logged_method({ logger })
  performComputation(firstNumber: number, secondNumber: number) {
    return firstNumber + secondNumber;
  }

  async fetchEntityByIdentifier(entityIdentifier: string) {
    return Promise.resolve({ entityIdentifier, status: "ok" });
  }

  private helperMethod() {
    // This method is explicitly disallowed and will not be wrapped
  }
}

(async function run() {
	const exampleServiceInstance = new ExampleServiceForDemonstration();
	ExampleServiceForDemonstration.performStaticPing(41);
	exampleServiceInstance.performComputation(1, 2);
	exampleServiceInstance.fetchEntityByIdentifier("abc");
})();
