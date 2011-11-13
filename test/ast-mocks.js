var std = require('std'),
	util = require('../src/util'),
	map = require('std/map'),
	isArray = require('std/isArray'),
	slice = require('std/slice')

module.exports = {
	value: value,
	literal: literal,
	alias: alias,
	aliases: aliases,
	composite: composite,
	value: value,
	list: list,
	xml: xml,
	declaration: declaration,
	declarations: declarations,
	ifElse: ifElse,
	forLoop: forLoop,
	importFile: importFile,
	importModule: importModule,
	inlineScript:inlineScript,
	handler:handler,
	argument:argument,
	'function':func,
	'return':ret,
	mutation:mutation,
	interface:interface,
	Text:_type('Text'),
	Number:_type('Number'),
	Anything:_type('Anything'),
	invocation: invocation,
	'null':nullValue()
}

function nullValue() {
	return { type:'NULL' }
}

function invocation(invocable /*, arg1, arg2, ... */) {
	var args = slice(arguments, 1)
	return { type:'INVOCATION', invocable:invocable, arguments:args }
}

function ret(value) {
	return { type:'RETURN', value:value }
}

function func(signature, block) {
	return { type:'FUNCTION', signature:signature, block:block }
}

function argument(name, interface) {
	return { type:'ARGUMENT', name:name, interface:interface }
}

function _type(name) {
	return { type:'INTERFACE', name:name }
}

function interface(content) {
	return { type:'INTERFACE', content:(isArray(content) ? content : map(content, function(val, key) {
		return { name:key, value:val }
	})) }
}

function mutation(operand, operator, args) {
	return { type:'MUTATION', operand:operand, operator:operator, arguments:args }
}

function literal(value) {
	return { type:'VALUE_LITERAL', value:value }
}

function value(value, interface) {
	var ast = {}
	ast.type = 'VALUE'
	ast.initialValue = value
	ast.valueType = typeof value
	if (typeof interface != 'undefined') { ast.interface = interface }
	return ast
}

function alias(namespace) {
	namespace = namespace.split('.')
	return { type:'ALIAS', namespace:namespace }
}

function aliases() {}

function composite(left, operator, right) {
	return { type:'COMPOSITE', operator:operator, left:left, right:right }
}

function list() {
	return { type:'LIST', content:std.slice(arguments, 0) }
}

function xml(tag, attrs, block) {
	attrs = map(attrs, function(val, key) {
		return { name:key, value:val }
	})
	return { type:'XML', tagName:tag, attributes:attrs, block:block || [] }
}

function declaration(name, value, interface) {
	return { type:'DECLARATION', name:name, value:value, interface:interface }
}

function declarations(name1, value1 /*, ... */) {
	var decls = []
	for (var i=0; i<arguments.length; i+=2) {
		decls.push(declaration(arguments[i], arguments[i+1]))
	}
	return decls
}

function ifElse(condition, ifBranch, elseBranch) {
	if (!std.isArray(ifBranch)) { ifBranch = [ifBranch] }
	if (elseBranch && !std.isArray(elseBranch)) { elseBranch = [elseBranch] }
	var ast = { type:'IF_STATEMENT', condition:condition, ifBlock:ifBranch, elseBlock:elseBranch || null }
	return ast
}

function forLoop(iterable, iteratorName, block) {
	var iterator = { type:'FOR_ITERATOR_DECLARATION', name:iteratorName, value: { type:'ITERATOR' } }
	return { type:'FOR_LOOP', iterable:iterable, iterator:iterator, block:block }
}

function importFile(path) {
	return { type:'IMPORT_FILE', path:path }
}

function importModule(name) {
	return { type:'IMPORT_MODULE', name:name }
}

function inlineScript(js) {
	return { type:'INLINE_SCRIPT', inlineJavascript:js }
}

function handler(signature, block) {
	return { type:'HANDLER', signature:signature || [], block:block || [] }
}