var compiler = exports,
	fs = require('fs'),
	assert = require('./util').assert,
	bind = require('./util').bind,
	map = require('./util').map,
	repeat = require('./util').repeat

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

/*********************
 * Utility functions *
 *********************/
function name(readable) { return '_' + (readable || '') + '$' + (name._uniqueId++) }
name._uniqueId = 0

var halt = function(msg) { throw new Error(msg) }

var emitReplaceRegex = /{{\s*(\w+)\s*}}/
function code(/* line1, line2, line3, ..., lineN, optionalValues */) {
	var argsLen = arguments.length,
		lastArg = arguments[argsLen - 1],
		injectObj = (typeof lastArg == 'string' ? null : lastArg),
		snippets = Array.prototype.slice.call(arguments, 0, injectObj ? argsLen - 1 : argsLen),
		code, match
	
	code = '\n' + snippets.join('\n')
	if (!injectObj) { return code }
	
	while (match = code.match(emitReplaceRegex)) {
		var wholeMatch = match[0],
			nameMatch = match[1]
		code = code.replace(wholeMatch, injectObj[nameMatch] || ('MISSING INJECT VALUE' + nameMatch))
	}
	return code
}

/************************
 * Top level statements *
 ************************/
function compile(context, ast, indentation) {
	assert(context && context.hookName && context.referenceTable, "compile called with invalid context", {context:context})
	if (ast instanceof Array) {
		return map(ast, bind(this, compileStatement, context)).join('\n') + '\n'
	} else {
		return compileStatement(context, ast) + '\n'
	}
}

function compileStatement(context, ast) {
	switch (ast.type) {
		case 'STRING':
			return compileString()
		case 'NUMBER':
			return compileNumber()
		case 'ALIAS':
			return compileAlias()
		case 'XML':
			return compileXML()
		case 'DECLARATION':
			return compileDeclaration()
		case 'IF_STATEMENT':
			return compileIfStatement()
		case 'FOR_LOOP':
			return compileForLoop()
		case 'INVOCATION':
			return compileInvocation()
		default:
			halt('Unknown AST type ' + ast.type)
	}
}

/**********************
 * Values and Aliases *
 **********************/
function compileString() {
	return '*** TODO Implement compileString ***'
}

function compileNumber() {
	halt('TODO compileNumber not yet implemented')
}

function compileAlias() {
	halt('TODO compileAlias not yet implemented')
}

/*******
 * XML *
 *******/
function compileXML() {
	halt('TODO compileXML not yet implemented')
}

/****************
 * Declarations *
 ****************/
function compileDeclaration() {
	halt('TODO compileDeclaration not yet implemented')
}

/**********************
 * If/Else statements *
 **********************/
function compileIfStatement() {
	halt('TODO compileIfStatement not yet implemented')
}

/*************
 * For loops *
 *************/
function compileForLoop() {
	halt('TODO compileForLoop not yet implemented')
}

/****************************************
 * Invocations (handlers and templates) *
 ****************************************/
function compileInvocation() {
	halt('TODO compileInvocation not yet implemented')
}
