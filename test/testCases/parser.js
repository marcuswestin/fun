var std = require('std'),
	parser = require('../../lib/parser'),
	tokenizer = require('../../lib/tokenizer'),
	a = require('../astMocks'),
	util = require("../../lib/util")

function object(kvps) {
	var content = []
	for (var key in kvps) { content.push({ name:key, value:kvps[key] }) }
	return { type:'OBJECT_LITERAL', content:content }
}


/* TESTS */
test('text literal')
	.code('"hello world"')
	.expect(a.literal("hello world"))

test('number literal')
	.code('1')
	.expect(a.literal(1))

test('declaration')
	.code('let greeting = "hello"')
	.expect(a.declaration('greeting', a.literal("hello")))

test('alias single namespace')
	.code('greeting')
	.expect(a.alias('greeting'))

test('alias double namespace')
	.code('user.name')
	.expect(a.alias('user.name'))

test('parenthesized expression')
	.code('(1)')
	.expect(a.literal(1))

test('double parenthesized expression')
	.code('(("hello"))')
	.expect(a.literal("hello"))

test('addition')
	.code('1+1')
	.expect(a.composite(a.literal(1), '+', a.literal(1)))

test('parenthesized subtraction')
	.code('(((1-1)))')
	.expect(a.composite(a.literal(1), '-', a.literal(1)))

test('simple if statement')
	.code('if (1 < 2) { 1 }')
	.expect(a.ifElse(a.composite(a.literal(1), '<', a.literal(2)), a.literal(1)))

test('has no null statements or expressions')
	.code('\nlet foo="bar"\n1\n\n')
	.expect(a.declaration("foo",a.literal("bar")), a.literal(1))

test('parses empty program')
	.code('')
	.expect()

test('* operator precedence 1')
	.code('1 + 2 * 3')
	.expect(a.composite(a.literal(1), '+', a.composite(a.literal(2), '*', a.literal(3))))

test('* operator precedence 2')
	.code('1 * 2 + 3')
	.expect(a.composite(a.composite(a.literal(1), '*', a.literal(2)), '+', a.literal(3)))

test('triple nested operators')
	.code('1 + 2 + 3 + 4')
	.expect(a.composite(a.literal(1), '+', a.composite(a.literal(2), '+', a.composite(a.literal(3), '+', a.literal(4)))))

test('empty for loop over list literal')
	.code('for (iterator in [1,2,3]) {}')
	.expect(a.forLoop(a.list(a.literal(1), a.literal(2), a.literal(3)), 'iterator', []))

test('self-closing xml')
	.code('<div />')
	.expect(a.xml('div', [], []))

test('inline javascript')
	.code('<script> var i = 1; function a() { alert(i++) }; setInterval(a); </script> let a = 1')
	.expect(a.inlineScript(' var i = 1; function a() { alert(i++) }; setInterval(a);'), a.declaration('a', a.literal(1)))

test('module import')
	.code('import Test')
	.expect(a.importModule('Test'))

test('file import')
	.code('import "test.fun"')
	.expect(a.importFile('test.fun'))

test('nested declaration')
	.code('let Foo = { nested: { cat:"yay" } }, Bar = Foo.nested\n Foo Bar Foo.nested')
	.expect(
		a.declarations(
			'Foo', object({
				nested:object({ cat:a.literal('yay') })
			}),
			'Bar', a.alias('Foo.nested')
		),
		a.alias('Foo'), a.alias('Bar'), a.alias('Foo.nested'))

test('just a declaration')
	.code('let Foo = { bar:1 }')
	.expect(a.declaration('Foo', object({ bar:a.literal(1) })))

/* UTIL */
function test(name) {
	util.resetUniqueID()
	var input
	return {
		code: function() {
			util.resetUniqueID()
			input = std.slice(arguments).join('\n')
			return this
		},
		expect: function() {
			var expected = std.slice(arguments)
			module.exports['parse\t\t"'+name+'"'] = function(assert) {
				assert.doesNotThrow(function() {
					util.resetUniqueID()
					try { var output = parse(input) }
					catch(e) { console.log("ERROR", e); throw e; }
					assert.deepEqual(output, expected)
					assert.done()
					return this
				})
			}
		}
	}
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

