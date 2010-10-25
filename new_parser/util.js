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

var repeat = util.repeat = function(str, times) {
	var arr = []
	arr.length = times + 1
	return arr.join(str)
}

util.indent = function(code) {
	var lines = code.replace(/\t/g, '').split('\n'),
		result = [],
		indentation = 0,
		openRegex = /\{/g,
		closeRegex = /\}/g,
		match = null
	
	for (var i=0, line; i < lines.length; i++) {
		line = lines[i]
		match = line.match(closeRegex)
		if (match) { indentation -= match.length }
		repeat(' ', indentation)
		result.push(repeat('\t', indentation) + line)
		match = line.match(openRegex)
		if (match) { indentation += match.length }
	}
	return result.join('\n')
}
