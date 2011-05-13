var isArray = require('./isArray')

module.exports = function(items, ctx, fn) {
	if (!items) { return }
	if (!fn) {
		fn = ctx
		ctx = this
	}
	if (isArray(items)) {
		for (var i=0; i < items.length; i++) {
			fn.call(ctx, items[i], i)
		}
	} else {
		for (var key in items) {
			fn.call(ctx, items[key], key)
		}
	}
}
