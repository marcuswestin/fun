var util = module.exports

var fs = require('fs'),
	repeat = require('std/repeat'),
	map = require('std/map'),
	filter = require('std/filter'),
	isArray = require('std/isArray')

util.q = function(val) { return JSON.stringify(val) }

var _uniqueId = 0
util.name = function(readable) { return '_' + (readable || '') + '_' + (_uniqueId++) }

var __uniqueID = 0
util.uniqueID = function() { return '__uniqueID' + (__uniqueID++) }
util.resetUniqueID = function() { __uniqueID = 0 }

util.cleanup = function(ast) {
	function clean(ast) {
		if (ast instanceof Array) {
			if (ast.length == 1) { return clean(ast[0]) }
			return map(filter(ast), clean)
		}
		return ast || []
	}
	var result = clean(ast)
	return !result ? [] : (isArray(result) ? result : [result])
}

util.create = function(oldObject, props) {
	function F() {}
	F.prototype = oldObject;
	var newObject = new F();
	for (var key in props) { newObject[key] = props[key] }
	return newObject
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

util.boxComment = function(msg) {
	var len = msg.length
	return '/**' + repeat('*', len) + "**\n" +
		' * ' + msg	+ " *\n" +
		' **' + repeat('*', len) + "**/"
}


util.grabLine = function(code, lineNumber, column, length) {
	if (!code) { return undefined }
	
	length = length || 1
	var lines = code.split('\n'),
		line = _replace(lines[lineNumber - 1], '\t', ' ')
	
	return '\n\t' + line + '\n\t'
		+ repeat(' ', column - 1) + repeat('^', length)
}

util.assert = function(ast, ok, msg) { if (!ok) util.halt(ast, msg) }
util.halt = function(ast, msg) {
	var info = ast.info || ast
	var prefix = info.inputFile
		? msg+'\nOn line '+info.line+' of file '+info.inputFile+': '
		: msg+'\nOn line '+info.line+' of input string: '

	var code = (info.inputFile ? fs.readFileSync(info.inputFile).toString() : info.inputString)
	throw new Error(prefix + util.grabLine(code, info.line, info.column, info.span))
}

util.listToObject = function(list) {
	var res = {}
	for (var i=0; i<list.length; i++) { res[list[i]] = true }
	return res
}

util.log = function() {
	console.log.apply(console, arguments)
}

util.isUpperCaseLetter = function(letter) {
	return letter.length == 1 && 'A' <= letter && letter <= 'Z'
}


/* unexposed utility functions
 *****************************/
function _replace(haystack, needle, replacement) {
	while (haystack.match(needle)) {
		haystack = haystack.replace(needle, replacement)
	}
	return haystack
}
