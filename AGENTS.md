STRICTLY FOLLOW ALL THE INSTRUCTIONS BELOW!

**Use Descriptive Names Only**
   Avoid abbreviations. Always use full, meaningful names for classes, variables, constants, methods, functions, parameters, and even for shorthand and lambda expressions.

**Handle Errors by Throwing Exceptions**
   Do not use `try/catch` blocks unless explicitly required by the workflow. Instead, throw exceptions directly to signal errors.

**Reference the Official Rujira resources**
   Base your work on the `resources/references` directory.

**Environment Variables**
   All required environment variables are already exported and available at runtime.

**Focus on Two Key Files**

   * `src/index.ts`
     Contains the entire implementation. Do not add code elsewhere. Never create/add any temporary, incomplete, mocked, or simulated code here. All the implentation should be complete and correct.
   * `integration/index.test.ts`
     Contains integration tests that require internet access and real interactions with the Rujira blockchain. These tests may use wallets with real funds:

     * Only run after verifying the implementation is fully correct.
     * If an RPC connection fails, wait a few seconds and retry.
     * Never create/add any temporary, incomplete, mocked, or simulated code here. All the implentation should be complete and correct.
     * It should always use internet and external resources while running.
     * Execute with `bun run test:integration`.

**Use Only Existing SDK and Library Methods**
   Ensure you call only methods that are present in the referenced SDKs and libraries. Do not use methods which you are not certain, if you don't know it, go to the reference folders and files and check them there first.

**Verify Test Success**
   After completing your work, confirm that all integration tests pass. If any tests fail, refine your implementation until every test succeeds.
