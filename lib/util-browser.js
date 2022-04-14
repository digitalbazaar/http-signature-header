// browser support
// assertions disabled in browsers
exports.assert = new Proxy({}, {
  get() {
    return () => {};
  }
});
