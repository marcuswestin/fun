var std = require('std')

module.exports = {
	static: static,
	alias: alias,
	composite: composite,
	declaration: declaration,
	ifElse: ifElse
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

function declaration(name, value) {
	return { type:'DECLARATION', name:name, value:value }
}

function ifElse(condition, ifBranch, elseBranch) {
	if (!std.isArray(ifBranch)) { ifBranch = [ifBranch] }
	if (elseBranch && !std.isArray(elseBranch)) { elseBranch = [elseBranch] }
	var ast = { type:'IF_STATEMENT', condition:condition, ifBlock:ifBranch, elseBlock:elseBranch || null }
	return ast
}

