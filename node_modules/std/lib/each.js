var isArray = require('./isArray')

module.exports = function(items, fn) {
	if (!items) { return }
	if (isArray(items)) {
		for (var i=0; i < items.length; i++) {
			fn(items[i], i)
		}
	} else {
		for (var key in items) {
			fn(items[key], key)
		}
	}
}
