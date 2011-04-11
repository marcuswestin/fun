var std = require('std')

module.exports = {
	static: static,
	alias: alias,
	composite: composite,
	property: property,
	list: list,
	xml: xml,
	declaration: declaration,
	ifElse: ifElse,
	forLoop: forLoop
}

function static(value) {
	var ast = { type:'STATIC', value:value }
	ast.valueType = typeof value
	return ast
}

function alias(namespace) {
	namespace = namespace.split('.')
	return { type:'ALIAS', namespace:namespace }
}

function composite(left, operator, right) {
	return { type:'COMPOSITE', left:left, right:right, operator:operator }
}

function property(id, property, value) {
	return { type:'ITEM_PROPERTY', value:value, valueType:typeof value, item:{id:id}, property:property }
}

function list() {
	return { type:'LIST', content:std.slice(arguments, 0), localName:'_LIST_LITERAL$1' }
}

function xml(tag, attrs, block) {
	return { type:'XML', tagName:tag, attributes:attrs, content:block }
}

function declaration(name, value) {
	return { type:'DECLARATION', name:name, value:value }
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
