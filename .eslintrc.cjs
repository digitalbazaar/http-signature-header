module.exports = {
  env: {
    node: true,
    browser: true
  },
  extends: [
    'digitalbazaar',
    'digitalbazaar/jsdoc',
    'digitalbazaar/module'
  ],
  rules: {
    'unicorn/prefer-node-protocol': 'error'
  }
};
