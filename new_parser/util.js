var q = exports.q = function(val) { return JSON.stringify(val) }

var assert = exports.assert = function(shouldBeTrue, msg) {
	if (shouldBeTrue) { return }
	throw new Error(msg)
}

assert.equal = function(v1, v2, msg) {
	assert(v1 == v2, msg || 'Not equal: ' + JSON.stringify(v1) + ' and ' + JSON.stringify(v2))
}

exports.debug = function() {
	console.log(_.map(arguments, function(v) { return JSON.stringify(v) }).join('\n\t '))
}