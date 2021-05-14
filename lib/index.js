// make this module esm
require = require('esm')(module);
// require main
const api = require('./main');
// forward all exports to
module.exports = api;
// see the default for es6 imports
exports.default = api;
