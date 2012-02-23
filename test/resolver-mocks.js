var a = require('./ast-mocks'),
	each = require('std/each'),
	isArray = require('std/isArray')

module.exports = Object.create(a)

module.exports.literal = function(val) {
	if (typeof val == 'object' && val != null && !isArray(val)) {
		each(val, function(contentVal, contentKey) { val[contentKey] = a.literal(contentVal) })
		return { type:'DICTIONARY_LITERAL', content:val }
	} else {
		return a.literal(val)
	}
}
