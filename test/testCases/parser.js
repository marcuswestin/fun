var std = require('std'),
	parser = require('../../lib/parser'),
	tokenizer = require('../../lib/tokenizer')

/* TESTS */
test('text literal', '"hello world"', static("hello world"))
test('number literal', '1', static(1))
test('declaration', 'let greeting = "hello"', { type:'DECLARATION', name:'greeting', value: static("hello") })
test('alias single namespace', 'greeting', alias('greeting'))
test('alias double namespace', 'user.name', alias('user.name'))
test('parenthesized expression', '(1)', static(1))
test('double parenthesized expression', '(("hello"))', static("hello"))
test('addition', '1+1', composite(static(1), '+', static(1)))
test('parenthesized subtraction', '(((1-1)))', composite(static(1), '-', static(1)))
test('simple if statement', 'if (1 < 2) { 1 }', ifElse(composite(static(1), '<', static(2)), static(1)))

/* UTIL */
function test(name, code, expectedAST) {
	module.exports['test '+name] = function(assert) {
		var ast = parse(code)
		assert.deepEqual(ast, expectedAST)
		assert.done()
	}
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

function ifElse(condition, ifBranch, elseBranch) {
	if (!std.isArray(ifBranch)) { ifBranch = [ifBranch] }
	if (elseBranch && !std.isArray(elseBranch)) { elseBranch = [elseBranch] }
	var ast = { type:'IF_STATEMENT', condition:condition, ifBlock:ifBranch, elseBlock:elseBranch || null }
	return ast
}

function composite(left, operator, right) {
	return { type:'COMPOSITE', left:left, right:right, operator:operator }
}

function parse(code) {
	tokens = tokenizer.tokenize(code)
	return pruneInfo(parser.parse(tokens))
}

function pruneInfo(ast) {
	for (var key in ast) {
		if (key == 'info') { delete ast[key] }
		else if (typeof ast[key] == 'object') { pruneInfo(ast[key]) }
	}
	return ast
}
