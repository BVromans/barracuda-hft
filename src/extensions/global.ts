declare global {
  // Extend NodeJS global scope for TS type checking
  var probe: <T>(p: Promise<T>) => void;
  var $test: unknown;
}

globalThis.probe = <T>(p: Promise<T>): void => {
  Promise.resolve(p).then(
    (value) => {
      globalThis.$test = value;
      debugger;
    },
    (error) => {
      globalThis.$test = error;
      debugger;
    }
  );
};

export {};
