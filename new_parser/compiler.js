var compiler = exports,
	fs = require('fs'),
	map = require('./util').map

/*********************
 * Utility functions *
 *********************/
function name(readable) { return '_' + (readable || '') + '$' + (name._uniqueId++) }
name._uniqueId = 0

function boxComment(msg) {
	var len = msg.length
	return '/**' + repeat('*', len) + "**\n" +
		' * ' + msg              + " *\n" +
		' **' + repeat('*', len) + "**/"
}

function repeat(str, times) {
	var arr = []
	arr.length = times
	return arr.join(str)
}

var emitReplaceRegex = /{{\s*(\w+)\s*}}/
function code(/* line1, line2, line3, ..., lineN, optionalValues */) {
	var argsLen = arguments.length,
		lastArg = arguments[argsLen - 1],
		replaceValues = (typeof lastArg == 'string' ? null : lastArg),
		snippets = Array.prototype.slice.call(arguments, 0, replaceValues ? argsLen - 1 : argsLen),
		code = '\n' + snippets.join('\n'),
		match
	
	while (match = code.match(emitReplaceRegex)) {
		var wholeMatch = match[0],
			nameMatch = match[1]
		code = code.replace(wholeMatch, replaceValues[nameMatch])
	}
	
	return code
}

compiler.compile = function(ast) {
	var libraryCode = fs.readFileSync(__dirname + '/lib.js').toString(),
		rootContext = { hookName: name('ROOT_HOOK'), referenceTable: {} }
	
	return code(
		'function initFunApp() {',
		'	var {{ rootHookName }} = fun.getHookID()',
		'	fun.setHook({{ rootHookName }}, document.body)',
			compile(rootContext, ast),
		'}',
		{ rootHookName: rootContext.hookName })
		+ '\n\n' + boxComment('Library code') + '\n' + libraryCode
}

function compile(context, ast, indentation) {
	return code('// TODO Compile the AST')
}
