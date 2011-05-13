var map = require('./map')

module.exports = function keys(obj) {
	return map(obj, function(val, key) { return key })
}
