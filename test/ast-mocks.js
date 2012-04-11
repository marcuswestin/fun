var util = require('../src/util'),
	map = require('std/map'),
	isArray = require('std/isArray'),
	slice = require('std/slice')

module.exports = {
	literal: literal,
	variable: variable,
	reference: reference,
	composite: composite,
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
	'null':nullValue
}

function reference(namespace) {
	namespace = namespace.split('.')
	return { type:'REFERENCE', name:namespace.shift(), chain:namespace }
}

function nullValue() {
	return { type:'NULL_LITERAL', value:null }
}

function invocation(operand /*, arg1, arg2, ... */) {
	var args = slice(arguments, 1)
	return { type:'INVOCATION', operand:operand, arguments:args }
}

function ret(value) {
	return { type:'RETURN', value:value }
}

function func(signature, block) {
	signature = map(signature, function(arg) { return typeof arg == 'string' ? argument(arg) : arg })
	return { type:'FUNCTION', signature:signature, block:block }
}

function argument(name) {
	return { type:'ARGUMENT', name:name }
}

function mutation(operand, operator, args) {
	return { type:'MUTATION', operand:operand, operator:operator, arguments:args }
}

function variable(name, initialValue) {
	return { type:'DECLARATION', name:name, initialValue:initialValue }
}

function composite(left, operator, right) {
	return { type:'COMPOSITE', left:left, operator:operator, right:right }
}

function xml(tag, attrs, block) {
	if (!isArray(attrs)) {
		attrs = map(attrs, function(val, key) {
			return { name:key, value:val }
		})
	}
	return { type:'XML', tagName:tag, attributes:attrs, block:block || [] }
}

function ifElse(condition, ifBranch, elseBranch) {
	if (!isArray(ifBranch)) { ifBranch = [ifBranch] }
	if (elseBranch && !isArray(elseBranch)) { elseBranch = [elseBranch] }
	var ast = { type:'IF_STATEMENT', condition:condition, ifBlock:ifBranch, elseBlock:elseBranch || null }
	return ast
}

function forLoop(iteratorName, iterable, block) {
	var iterator = { type:'REFERENCE', name:iteratorName, chain:null }
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
		val = typeof val == 'string' ? reference(val) : val
		return { name:key, value:val }
	})
	return { type:'SCRIPT_TAG', attributes:attributes, inlineJavascript:js || '' }
}

function handler(signature, block) {
	return { type:'HANDLER', signature:signature || [], block:block || [] }
}



function literal(val) {
	switch (typeof val) {
		case 'number': return { type:'NUMBER_LITERAL', value:val }
		case 'string': return { type:'TEXT_LITERAL', value:val }
		case 'boolean': return { type:'LOGIC_LITERAL', value:val }
		case 'object':
			if (val == null) { return nullValue() }
			if (isArray(val)) { return _list(val) }
			return _object(val)
		default: val
	}
}
function _object(kvps) {
	var content = []
	for (var key in kvps) { content.push({ name:key, value:literal(kvps[key]) }) }
	return { type:'DICTIONARY_LITERAL', content:content }
}
function _list(val) {
	return { type:'LIST_LITERAL', content:map(val, literal) }
}
