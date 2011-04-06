var std = require('std'),
	parser = require('../../lib/parser'),
	tokenizer = require('../../lib/tokenizer'),
	a = require('../astMocks')

/* TESTS */
test('text literal', '"hello world"', a.static("hello world"))
test('number literal', '1', a.static(1))
test('declaration', 'let greeting = "hello"', a.declaration('greeting', a.static("hello")))
test('alias single namespace', 'greeting', a.alias('greeting'))
test('alias double namespace', 'user.name', a.alias('user.name'))
test('parenthesized expression', '(1)', a.static(1))
test('double parenthesized expression', '(("hello"))', a.static("hello"))
test('addition', '1+1', a.composite(a.static(1), '+', a.static(1)))
test('parenthesized subtraction', '(((1-1)))', a.composite(a.static(1), '-', a.static(1)))
test('simple if statement', 'if (1 < 2) { 1 }', a.ifElse(a.composite(a.static(1), '<', a.static(2)), a.static(1)))
test('has no null statements or expressions', '\nlet foo="bar"\n1\n\n', [a.declaration("foo",a.static("bar")), a.static(1)])

/* UTIL */
function test(name, code, expectedAST) {
	module.exports['test '+name] = function(assert) {
		var ast = parse(code)
		assert.deepEqual(ast, expectedAST)
		assert.done()
	}
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
