Object.defineProperty(globalThis, "process", {
  configurable: true,
  enumerable: false,
  value: { env: {} },
  writable: true,
});
