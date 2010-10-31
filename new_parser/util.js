var util = exports

var sys = require('sys'),
	fs = require('fs')

var q = util.q = function(val) { return JSON.stringify(val) }

util.debug = function(msg) {
	// console.log(msg)
}

util.shallowCopy = function(obj) {
	if (obj instanceof Array) { return Array.prototype.slice.call(obj, 0) }
	else {
		var result = {}
		for (var key in obj) { result[key] = obj[key] }
		return result
	}
}

util.create = function(oldObject) {
	function F() {}
	F.prototype = oldObject;
	return new F();
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
	if (arr instanceof Array) {
		for (var i=0, item; item = arr[i]; i++) { result.push(fn(item, i)) }
	} else {
		for (var key in arr) { result.push(fn(arr[key], key)) }
	}
	return result
}

var repeat = util.repeat = function(str, times) {
	var arr = []
	arr.length = times + 1
	return arr.join(str)
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

util.grabLine = function(file, line, column, length) {
	length = length || 1
	var code = fs.readFileSync(file).toString(),
		lines = code.split('\n')
	return '\n' + lines[line - 1] + '\n'
		+ repeat(' ', column - 1) + repeat('^', length)
}