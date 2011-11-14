var std = require('std'),
	a = require('../resolver-mocks'),
	resolver = require('../../src/resolver'),
	parser = require('../../src/parser'),
	tokenizer = require('../../src/tokenizer'),
	util = require('../../src/util')

test("a declared alias for a string")
	.code(
		'let guy = "Marcus"',
		'guy'
	)
	.values(ref(1, a.value('Marcus')))
	.expressions(a.value('Marcus'))
	.expressions(ref(1))

test("an empty div")
	.code(
		'<div/>'
	)
	.expressions(a.xml('div'))

test("two nested properties")
	.code(
		'let foo = { bar:1, cat:"cat" }',
		'foo.bar foo.cat'
	)
	.values(ref(1, a.value(1)), ref(2, a.value("cat")))
	.expressions(a.value(1), a.value("cat"))
	.expressions(ref(1), ref(2))

test('nested values')
	.code(
		'let foo = { nested: { cat:"yay" } }',
		'let bar = foo.nested',
		'let cat = bar.cat',
		'let cat2 = foo.nested.cat',
		'foo.nested.cat bar.cat cat bar')
	.values(
		ref(1, a.value('cat')),
		ref(2, a.value({ cat:ref(1) })),
		ref(3, a.value({ nested:ref(2) })),
		ref(4, a.dereference(ref(3), 'nested')),
		ref(5, a.dereference(ref(4), 'cat')),
		ref(6, a.dereference(ref(3), 'nested.cat'))
	)
	.expressions(a.dereference(), ref(1), ref(1), ref(4))

all values are typed at runtime, and can change type. there are
	atomics: numbers, text, bool, null
	collections: list, object
	collection dereferences: foo.bar.cat, taw[1][4]
	do we want dynamic dereferencing?: foo[bar]
an expression is
	


a dereference is a value

test('clicking a button updates the UI')
	.code(
		'let foo = "bar"',
		'let qwe = "cat"',
		'<div id="output">foo</div>',
		'<button id="button">"Click me"</button onClick=handler() {',
		'	foo.set("cat")',
		'	qwe.set(foo)',
		'}>')
	.values(
		ref(1, a.value("bar")),
		ref(2, a.value("cat")),
		ref(3, a.handler([], [
			a.mutation(ref(1), 'set', [a.literal('cat')]),
			a.mutation(ref(2), 'set', [ref(1)])
		]))
	)
	.expressions(
		a.xml('div', { id:a.literal('output') }, [ ref(1) ]),
		a.xml('button', { id:a.literal('button'), onclick:ref(3) }, [ a.literal('Click me') ])
	)

// Boolean values
// Null values
// Handlers, Functions and Templates as expressions and being emitted
// 
// test('typed value values')
// 	.code(
// 		'let Response = { error:Text, result:Text }',
// 		'let Response response = { error:"foo", result:"bar" }',
// 		'response'
// 	)
// 	.expect(
// 		a.declaration('Response', a.interface({ error:a.Text, result:a.Text })),
// 		a.declaration('response', a.object({ error:a.literal('foo'), result:a.literal('bar') }), a.alias('Response')),
// 		a.alias('response')
// 	)
// 
// test('typed function declaration and invocation')
// 	.code(
// 		'let Response = { error:Text, result:Text }',
// 		'let Response post = function(Text path, Anything params) {',
// 		'	return { error:"foo", response:"bar" }',
// 		'}',
// 		'let response = post("/test", { foo:"bar" })'
// 	)
// 	.expect(
// 		a.declaration('Response', a.interface({ error:a.Text, result:a.Text })),
// 		a.declaration('post', a.function([a.argument('path', a.Text), a.argument('params', a.Anything)], [
// 			a.return(a.object({ error:a.literal('foo'), response:a.literal('bar') }))
// 		]), a.alias('Response')),
// 		a.declaration('response', a.invocation(a.alias('post'), a.literal('/test'), a.object({ foo:a.literal('bar')})))
// 	)

// TODO test file imports

/* Util
 ******/
function test(name) {
	util.resetUniqueID()
	ref.references = {}
	var inputCode
	return {
		code: function(/* line1, line2, ... */) {
			inputCode = std.slice(arguments).join('\n')
			return this
		},
		expressions: function() {
			runTest('expressions', std.slice(arguments))
			return this
		},
		values: function() {
			runTest('values', std.slice(arguments))
			return this
		}
	}
	function runTest(type, expectedAST) {
		var inputAST = parser.parse(tokenizer.tokenize(inputCode))
		util.resetUniqueID() // TODO the unique IDs function should probably be on the resolver
		var count = 1,
			testName = type+'\t'+'"'+name+'" ' + (count++ == 1 ? '' : count)
		while (module.exports[testName]) {
			testName = type+'\t'+'"'+name+'" ' + (count++)
		}
		module.exports[testName] = function(assert) {
			try {
				var actualAST = resolver.resolve(inputAST)[type]
				assert.deepEqual(expectedAST, actualAST)
				assert.done()
			} catch(e) {
				console.log('resolver threw', e.stack)
			}
		}
	}
}

function ref(id, value) {
	var references = ref.references
	if (value) {
		if (references[id]) { throw new Error("Same test reference declared twice") }
		references[id] = value
	} else {
		if (!references[id]) { throw new Error("Referenced undeclared test reference") }
	}
	return references[id]
}
