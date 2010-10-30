var compiler = exports,
	fs = require('fs'),
	sys = require('sys'),
	util = require('./util'),
	bind = util.bind,
	map = util.map,
	repeat = util.repeat,
	boxComment = util.boxComment

exports.compile = util.intercept('CompileError', doCompile)

var CompileError = function(file, ast, msg) {
	this.name = "CompileError"
	this.message = ['on line', ast.line + ',', 'column', ast.column, 'of', '"'+file+'":', msg].join(' ')
}
CompileError.prototype = Error.prototype

function doCompile(ast, rootContext) {
	rootContext = rootContext || { hookName: name('ROOT_HOOK'), referenceTable: {} }
	
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

var assert = function(ok, ast, msg) { if (!ok) halt(ast, msg) }
var halt = function(ast, msg) {
	sys.puts(util.grabLine(ast.file, ast.line, ast.column, ast.span))
	throw new CompileError(ast.file, ast, msg)
}

/************************
 * Top level statements *
 ************************/
function compile(context, ast) {
	assert(context && context.hookName && context.referenceTable, ast, "compile called with invalid context")
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
			halt(ast, 'Unknown AST type ' + ast.type)
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
	assert(ast.type == 'ALIAS', ast, 'Expected an ALIAS but found a ' + ast.type)
	var valueAST = _getReference(context, ast)
	return compileInlineValue(context, valueAST)
}

/*******
 * XML *
 *******/
function compileXML(context, ast) {
	halt(ast, 'TODO compileXML not yet implemented')
}

/****************
 * Declarations *
 ****************/
function compileDeclaration(context, ast) {
	_setReference(context, ast)
	return ''
}

var _setReference = function(context, ast) {
	var baseValue = _getReference(context, ast, true),
		name = ast.namespace[ast.namespace.length - 1]
	baseValue['__alias__' + name] = ast.value
}
var _getReference = function(context, ast, skipLast) {
	var referenceTable = context.referenceTable,
		value = referenceTable,
		namespace = ast.namespace,
		len = namespace.length - (skipLast ? 1 : 0)
	
	for (var i=0; i < len; i++) {
		value = value['__alias__' + namespace[i]]
		if (!value) {
			halt(ast, 'Undeclared alias "'+namespace[i]+'"' + (i == 0 ? '' : ' on "'+namespace.slice(0, i).join('.')+'"'))
		}
	}
	
	return value
}

/**********************
 * If/Else statements *
 **********************/
function compileIfStatement(context, ast) {
	halt(ast, 'TODO compileIfStatement not yet implemented')
}

/*************
 * For loops *
 *************/
function compileForLoop(context, ast) {
	halt(ast, 'TODO compileForLoop not yet implemented')
}

/****************************************
 * Invocations (handlers and templates) *
 ****************************************/
function compileInvocation(context, ast) {
	halt(ast, 'TODO compileInvocation not yet implemented')
}
