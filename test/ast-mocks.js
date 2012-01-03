var std = require('std'),
	util = require('../src/util'),
	map = require('std/map'),
	isArray = require('std/isArray'),
	slice = require('std/slice')

module.exports = {
	value: value,
	literal: literal,
	alias: alias,
	variable: variable,
	reference: reference,
	composite: composite,
	value: value,
	list: list,
	xml: xml,
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
	invocation: invocation,
	'null':nullValue,
	object:object
}

function object(kvps) {
	var content = []
	for (var key in kvps) { content.push({ name:key, value:kvps[key] }) }
	return { type:'OBJECT_LITERAL', content:content }
}

function reference(namespace) {
	namespace = namespace.split('.')
	return { type:'REFERENCE', name:namespace.shift(), chain:namespace }
}

function nullValue() {
	return { type:'VALUE_LITERAL', value:null }
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

function argument(name) {
	return { type:'ARGUMENT', name:name }
}

function mutation(operand, operator, args) {
	return { type:'MUTATION', operand:operand, operator:operator, arguments:args }
}

function literal(value) {
	return { type:'VALUE_LITERAL', value:value }
}

function value(value) {
	var ast = {}
	ast.type = 'VALUE'
	ast.initialValue = value
	ast.valueType = typeof value
	return ast
}

function alias(name, value) {
	return { type:'ALIAS_DECLARATION', name:name, value:value }
}

function variable(name, initialValue) {
	if (typeof initialValue == 'number' || typeof initialValue == 'string') { initialValue = literal(initialValue) }
	return { type:'VARIABLE_DECLARATION', name:name, initialValue:initialValue }
}

function composite(left, operator, right) {
	return { type:'COMPOSITE', operator:operator, left:left, right:right }
}

function list() {
	return { type:'LIST_LITERAL', content:std.slice(arguments, 0) }
}

function xml(tag, attrs, block) {
	attrs = map(attrs, function(val, key) {
		return { name:key, value:val }
	})
	return { type:'XML', tagName:tag, attributes:attrs, block:block || [] }
}

function ifElse(condition, ifBranch, elseBranch) {
	if (!std.isArray(ifBranch)) { ifBranch = [ifBranch] }
	if (elseBranch && !std.isArray(elseBranch)) { elseBranch = [elseBranch] }
	var ast = { type:'IF_STATEMENT', condition:condition, ifBlock:ifBranch, elseBlock:elseBranch || null }
	return ast
}

function forLoop(iterable, iteratorName, block) {
	var iterator = { type:'ITERATOR', name:iteratorName }
	return { type:'FOR_LOOP', iterable:iterable, iterator:iterator, block:block }
}

function importFile(path) {
	return { type:'IMPORT_FILE', path:path }
}

function importModule(name) {
	return { type:'IMPORT_MODULE', name:name }
}

function inlineScript(attributes, js) {
	attributes = map(attributes, function(val, key) {
		return { name:key, value:val }
	})
	return { type:'SCRIPT_TAG', attributes:attributes, inlineJavascript:js }
}

function handler(signature, block) {
	return { type:'HANDLER', signature:signature || [], block:block || [] }
}