var isArray = require('./isArray'),
	each = require('./each')

module.exports = function flatten(arr) {
	var result = []
	each(arr, function(val) {
		if (!isArray(val)) { return result.push(val) }
		result.push.apply(result, flatten(val))
	})
	return result
}
