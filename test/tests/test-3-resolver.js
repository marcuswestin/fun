var std = require('std'),
	a = require('../resolver-mocks'),
	resolver = require('../../lib/resolver'),
	parser = require('../../lib/parser'),
	tokenizer = require('../../lib/tokenizer'),
	util = require('../../lib/util')

test("a declared alias for a string")
	.code(
		'let guy = "Marcus"',
		'guy'
	)
	.declarations(ref(1, a.value('Marcus')))
	.expressions(a.value('Marcus'))
	.expressions(ref(1))

test("an empty div")
	.code(
		'<div/>'
	)
	.expressions(a.xml('div'))

test("two nested properties")
	.code(
		'let Foo = { bar:1, cat:"cat" }',
		'Foo.bar Foo.cat'
	)
	.declarations(ref(1, a.value(1)), ref(2, a.value("cat")))
	.expressions(a.value(1), a.value("cat"))
	.expressions(ref(1), ref(2))

test('nested declarations')
	.code(
		'let Foo = { nested: { cat:"yay" } },',
		'	Bar = Foo.nested,',
		'	cat = Bar.cat',
		'Foo.nested.cat Bar.cat cat Bar')
	.declarations(ref(1, a.value("yay")))
	.expressions([], ref(1), ref(1), ref(1), a.object({ cat:ref(1) }))

test('clicking a button updates the UI')
	.code(
		'let foo = "bar"',
		'let qwe = "cat"',
		'<div id="output">foo</div>',
		'<button id="button">"Click me"</button onClick=handler() {',
		'	foo.set("cat")',
		'	qwe.set(foo)',
		'}>')
	.declarations(
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
		declarations: function() {
			runTest('declarations', std.slice(arguments))
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
