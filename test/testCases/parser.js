var std = require('std'),
	parser = require('../../lib/parser'),
	tokenizer = require('../../lib/tokenizer'),
	a = require('../astMocks')

/* TESTS */
test('text literal')
	.input('"hello world"')
	.expect(a.static("hello world"))

test('number literal')
	.input('1')
	.expect(a.static(1))

test('declaration')
	.input('let greeting = "hello"')
	.expect(a.declaration('greeting', a.static("hello")))

test('alias single namespace')
	.input('greeting')
	.expect(a.alias('greeting'))

test('alias double namespace')
	.input('user.name')
	.expect(a.alias('user.name'))

test('parenthesized expression')
	.input('(1)')
	.expect(a.static(1))

test('double parenthesized expression')
	.input('(("hello"))')
	.expect(a.static("hello"))

test('addition')
	.input('1+1')
	.expect(a.composite(a.static(1), '+', a.static(1)))

test('parenthesized subtraction')
	.input('(((1-1)))')
	.expect(a.composite(a.static(1), '-', a.static(1)))

test('simple if statement')
	.input('if (1 < 2) { 1 }')
	.expect(a.ifElse(a.composite(a.static(1), '<', a.static(2)), a.static(1)))

test('has no null statements or expressions')
	.input('\nlet foo="bar"\n1\n\n')
	.expect(a.declaration("foo",a.static("bar")), a.static(1))

test('parses empty program')
	.input('')
	.expect()

test('* operator precedence 1')
	.input('1 + 2 * 3')
	.expect(a.composite(a.static(1), '+', a.composite(a.static(2), '*', a.static(3))))

test('* operator precedence 2')
	.input('1 * 2 + 3')
	.expect(a.composite(a.composite(a.static(1), '*', a.static(2)), '+', a.static(3)))

test('triple nested operators')
	.input('1 + 2 + 3 + 4')
	.expect(a.composite(a.static(1), '+', a.composite(a.static(2), '+', a.composite(a.static(3), '+', a.static(4)))))

test('empty for loop over list literal')
	.input('for (iterator in [1,2,3]) {}')
	.expect(a.forLoop(a.list(a.static(1), a.static(2), a.static(3)), 'iterator', []))

test('self-closing xml')
	.input('<div />')
	.expect(a.xml('div', [], []))

/* UTIL */
function test(name) {
	var input
	var testObj = {
		input: function() {
			input = std.slice(arguments).join('\n')
			return testObj
		},
		expect: function() {
			var expected = std.slice(arguments)
			module.exports['test resolver '+name] = function(assert) {
				var output = parse(input)
				assert.deepEqual(output, expected)
				assert.done()
			}
		}
	}
	return testObj
}

function parse(code) {
	tokens = tokenizer.tokenize(code)
	return pruneInfo(parser.parse(tokens))
}

function pruneInfo(ast) {
	if (std.isArray(ast)) {
		return std.map(ast, pruneInfo)
	} else {
		for (var key in ast) {
			if (key == 'info') { delete ast[key] }
			else if (typeof ast[key] == 'object') { pruneInfo(ast[key]) }
		}
		return ast
	}
}

