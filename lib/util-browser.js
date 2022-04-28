// browser support
// assertions disabled in browsers
export const assert = new Proxy({}, {
  get() {
    return () => {};
  }
});
