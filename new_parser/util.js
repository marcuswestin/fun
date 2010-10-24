var sys = require('sys')

var q = exports.q = function(val) { return JSON.stringify(val) }

var assert = exports.assert = function(shouldBeTrue, msg) {
	if (shouldBeTrue) { return }
	throw new Error(msg)
}

assert.equal = function(v1, v2, msg) {
	assert(v1 == v2, msg || 'Not equal: ' + JSON.stringify(v1) + ' and ' + JSON.stringify(v2))
}

exports.debug = function(msg) {
	sys.puts(msg)
}