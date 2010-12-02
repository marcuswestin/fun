var util = exports

var sys = require('sys'),
	fs = require('fs')

var q = util.q = function(val) { return JSON.stringify(val) }

util.debug = function(msg) {
	// console.log(msg)
}

util.copyArray = function(arr) {
	return Array.prototype.slice.call(arr, 0)
}

util.shallowCopy = function(obj, merge) {
	var result = {}
	for (var key in obj) { result[key] = obj[key] }
	for (var key in merge) { result[key] = merge[key] }
	return result
}

util.create = function(oldObject) {
	function F() {}
	F.prototype = oldObject;
	return new F();
}

util.log = function() {
	var arr = Array.prototype.slice.call(arguments, 0)
	sys.puts('console.log.apply(this, '+JSON.stringify(arr)+')')
}

util.intercept = function(errorName, fn) {
	return function() {
		try { return fn.apply(this, arguments) }
		catch(e) {
			if (e.name != errorName) { sys.puts(e.stack) }
			sys.puts(e.name + ': ' + e.message)
			process.exit(1)
		}
	}
}

util.map = function(arr, fn) {
	var result = []
	if (arr instanceof Array) { for (var i=0; i < arr.length; i++) result.push(fn(arr[i], i)) }
	else { for (var key in arr) result.push(fn(arr[key], key)) }
	return result
}
util.each = function(arr, fn) {
	for (var i=0; i < arr.length; i++) fn(arr[i], i)
}
util.pickOne = function(arr, fn) {
	for (var res, i=0; i < arr.length; i++) {
		res = fn(arr[i], i)
		if (typeof res != 'undefined') { return res }
	}
}
util.pick = function(arr, fn) {
	var result = []
	for (var i=0, value; i < arr.length; i++) {
		value = fn(arr[i])
		if (value) { result.push(value) }
	}
	return result
}

var repeat = util.repeat = function(str, times) {
	if (times < 0) { return '' }
	return new Array(times + 1).join(str)
}

util.boxComment = function(msg) {
	var len = msg.length
	return '/**' + repeat('*', len) + "**\n" +
		' * ' + msg	+ " *\n" +
		' **' + repeat('*', len) + "**/"
}


var bind = util.bind = function(context, method) {
	var args = Array.prototype.slice.call(arguments,2);
	return function bound(){
		method=(typeof method=='string' ? context[method] : method);
		return method.apply(context, args.concat(Array.prototype.slice.call(arguments,0)))
	}
}

util.indent = function(code) {
	var lines = code.replace(/\t/g, '').split('\n'),
		result = [],
		indentation = 0
	
	for (var i=0, line; i < lines.length; i++) {
		line = lines[i]
		
		if (line.match(/^\s*\}/)) { indentation-- }
		result.push(repeat('\t', indentation) + line)
		if (line.match(/\{\s*$/)) { indentation++ }
	}
	return result.join('\n')
}

util.replace = function(haystack, needle, replacement) {
	while (haystack.match(needle)) {
		haystack = haystack.replace(needle, replacement)
	}
	return haystack
}

util.grabLine = function(file, lineNumber, column, length) {
	length = length || 1
	var code = fs.readFileSync(file).toString(),
		lines = code.split('\n'),
		line = util.replace(lines[lineNumber - 1], '\t', ' ')
	
	return '\n' + line + '\n'
		+ repeat(' ', column - 1) + repeat('^', length)
}

