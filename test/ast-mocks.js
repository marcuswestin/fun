var std = require('std'),
	util = require('../lib/util')

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
	inlineScript:inlineScript
}

function literal(value) {
	return { type:'VALUE_LITERAL', value:value }
}

function value(value) {
	var ast = util.create({ uniqueID:util.uniqueID() })
	ast.type = 'VALUE'
	ast.initialValue = value
	ast.valueType = typeof value
	return ast
}

function alias(namespace) {
	namespace = namespace.split('.')
	return { type:'ALIAS', namespace:namespace }
}

function aliases() {}

function composite(left, operator, right) {
	return { type:'COMPOSITE', left:left, right:right, operator:operator }
}

function list() {
	return { type:'LIST', content:std.slice(arguments, 0), localName:'_LIST_LITERAL$0' }
}

function xml(tag, attrs, block) {
	return { type:'XML', tagName:tag, attributes:attrs || [], block:block || [] }
}

function declaration(name, value) {
	return { type:'DECLARATION', name:name, value:value }
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
	var iterator = { type:'FOR_ITERATOR_DECLARATION', name:iteratorName, value: { type:'RUNTIME_ITERATOR' } }
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
