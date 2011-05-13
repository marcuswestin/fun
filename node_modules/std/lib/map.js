var each = require('./each')

module.exports = function(items, fn) {
	var result = []
	each(items, function(item, key) {
		result.push(fn(item, key))
	})
	return result
}
