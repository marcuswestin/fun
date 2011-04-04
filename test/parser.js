var testCase = require('nodeunit').testCase,
	parser = require('../language/parser'),
	tokenizer = require('../language/tokenizer')

/* TESTS */
test('text literal', '"hello world"', static("hello world"))
test('number literal', '1', static(1))
test('declaration', 'let greeting = "hello"', { type:'DECLARATION', name:'greeting', value: static("hello") })
test('alias single namespace', 'greeting', { type:'ALIAS', namespace:['greeting'] })
test('alias double namespace', 'user.name', { type:'ALIAS', namespace:['user','name'] })
test('parenthesized expression', '(1)', static(1))
test('double parenthesized expression', '(("hello"))', static("hello"))

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
