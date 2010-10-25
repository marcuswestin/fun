var compiler = exports,
	fs = require('fs'),
	assert = require('./util').assert,
	bind = require('./util').bind,
	map = require('./util').map,
	repeat = require('./util').repeat,
	boxComment = require('./util').boxComment

compiler.compile = function(ast) {
	var libraryCode = fs.readFileSync(__dirname + '/lib.js').toString(),
		rootContext = { hookName: name('ROOT_HOOK'), referenceTable: {} }

	return code(
		'function initFunApp() {',
		'	var {{ rootHookName }} = fun.name("rootHook")',
		'	fun.setHook({{ rootHookName }}, document.body)',
			compile(rootContext, ast),
		'}',
		{
			rootHookName: rootContext.hookName
		})
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
		case 'NUMBER':
			return compileInlineValue(context, ast)
		case 'ALIAS':
			return compileAlias(context, ast)
		case 'XML':
			return compileXML(context, ast)
		case 'DECLARATION':
			return compileDeclaration(context, ast)
		case 'IF_STATEMENT':
			return compileIfStatement(context, ast)
		case 'FOR_LOOP':
			return compileForLoop(context, ast)
		case 'INVOCATION':
			return compileInvocation(context, ast)
		default:
			halt('Unknown AST type ' + ast.type)
	}
}

/**********************
 * Values and Aliases *
 **********************/
function compileInlineValue(context, ast) {
	return code(
		'fun.hook({{ parentHook }}, fun.name("inlineString")).innerHTML = {{ value }}',
		{
			parentHook: context.hookName,
			value: JSON.stringify(ast.value)
		})
}

function compileAlias(context, ast) {
	assert(ast.type == 'ALIAS', 'Expected an ALIAS by found a ' + ast.type)
	assert(ast.namespace.length == 1, 'TODO Implement alias dot notation namespace lookups')
	var name = ast.namespace[0]
	
	var valueAST = _getReference(context, name)
	return compileInlineValue(context, valueAST)
}

/*******
 * XML *
 *******/
function compileXML(context, ast) {
	halt('TODO compileXML not yet implemented')
}

/****************
 * Declarations *
 ****************/
function compileDeclaration(context, ast) {
	_setReference(context, ast.name, ast.value)
	return ''
}

var _setReference = function(context, name, reference) {
	var referenceTable = context.referenceTable
	assert(!referenceTable[name], 'Repeat Declaration', { name:name })
	referenceTable[name] = reference
}
var _getReference = function(context, name) {
	var referenceTable = context.referenceTable
	assert(referenceTable[name], 'Undeclared Reference', { name: name, table: referenceTable })
	return referenceTable[name]
}

/**********************
 * If/Else statements *
 **********************/
function compileIfStatement(context, ast) {
	halt('TODO compileIfStatement not yet implemented')
}

/*************
 * For loops *
 *************/
function compileForLoop(context, ast) {
	halt('TODO compileForLoop not yet implemented')
}

/****************************************
 * Invocations (handlers and templates) *
 ****************************************/
function compileInvocation(context, ast) {
	halt('TODO compileInvocation not yet implemented')
}
