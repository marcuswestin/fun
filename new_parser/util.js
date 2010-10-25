var util = exports

var sys = require('sys')

var q = util.q = function(val) { return JSON.stringify(val) }

var assert = util.assert = function(shouldBeTrue, msg) {
	if (shouldBeTrue) { return }
	throw new Error(msg)
}

assert.equal = function(v1, v2, msg) {
	assert(v1 == v2, msg || 'Not equal: ' + JSON.stringify(v1) + ' and ' + JSON.stringify(v2))
}

util.debug = function(msg) {
	sys.puts(msg)
}

util.map = function(arr, fn) {
	var result = []
	for (var i=0, item; item = arr[i]; i++) {
		result.push(fn(item))
	}
	return result
}
