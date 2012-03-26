var parser = require('../../src/parser'),
	tokenizer = require('../../src/tokenizer'),
	a = require('../parser-mocks'),
	util = require("../../src/util"),
	slice = require('std/slice')

test('text literal')
	.code('"hello world"')
	.expect(a.literal("hello world"))

test('number literal')
	.code('1')
	.expect(a.literal(1))

test('declaration')
	.code('let greeting = "hello"')
	.expect(a.variable('greeting', a.literal("hello")))

test('alias single namespace')
	.code('greeting')
	.expect(a.reference('greeting'))

test('alias double namespace')
	.code('user.name')
	.expect(a.reference('user.name'))

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
	.code('if 1 is < 2 { 1 }')
	.expect(a.ifElse(a.composite(a.literal(1), '<', a.literal(2)), a.literal(1)))

test('has no null statements or expressions')
	.code('let foo="bar"\n1')
	.expect(a.variable("foo",a.literal("bar")), a.literal(1))

test('variable declaration')
	.code('let foo = "bar"')
	.expect(a.variable('foo', a.literal('bar')))

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

test('list literal')
	.code('["foo", 1, null]')
	.expect(a.literal(['foo', 1, null]))

test('empty for loop over list literal')
	.code('for iterator in [1,2,3] {}')
	.expect(a.forLoop('iterator', a.literal([1,2,3]), []))

test('self-closing xml')
	.code('<div />')
	.expect(a.xml('div'))

test('inline javascript')
	.code('let foo = 1\n <script fooVariable=foo> var i = 1; function a() { alert(i++) }; setInterval(a); </script>')
	.expect(
		a.variable('foo', a.literal(1)),
		a.inlineScript({ fooVariable:a.reference('foo') }, ' var i = 1; function a() { alert(i++) }; setInterval(a);')
	)

test('module import')
	.code('import Test')
	.expect(a.importModule('Test'))

test('file import')
	.code('import "test.fun"')
	.expect(a.importFile('test.fun'))

test('nested declaration')
	.code(
		'let foo = { nested: { cat:"yay" } }',
		'foo bar foo.nested'
	)
	.expect(
		a.variable('foo', a.literal({ nested:{ cat:'yay' } })),
		a.reference('foo'), a.reference('bar'), a.reference('foo.nested')
	)

test('deep nested declaration')
	.code('let asd = {a:{b:{c:{d:{e:{f:{}}}}}}}')
	.expect(a.variable('asd', a.literal({a:{b:{c:{d:{e:{f:{}}}}}}})))

test('just a declaration')
	.code('let foo = { bar:1 }')
	.expect(a.variable('foo', a.literal({ bar:1 })))

test('a handler')
	.code(
		'let aHandler = handler(){}'
	)
	.expect(
		a.variable('aHandler', a.handler())
	)

test('a button which mutates state')
	.code(
		'let foo="bar"',
		'<button></button onclick=handler(){ foo set: "cat" }>'
	)
	.expect(
		a.variable('foo', a.literal("bar")),
		a.xml('button', { 'onclick':a.handler([],[
			a.mutation(a.reference('foo'), 'set', [a.literal("cat")])
		])})
	)

test('handler with logic')
	.code(
		'let cat = "hi"',
		'let foo = handler() {',
		'	if cat is == "hi" { cat set: "bye" }',
		'	else { cat set: foo }',
		'}'
	)
	.expect(
		a.variable('cat', a.literal('hi')),
		a.variable('foo', a.handler([], [
			a.ifElse(a.composite(a.reference('cat'), '==', a.literal('hi')),[
				a.mutation(a.reference('cat'), 'set', [a.literal('bye')])
			], [
				a.mutation(a.reference('cat'), 'set', [a.reference('foo')])
			])
		]))
	)

test('parse emits then declarations')
	.code(
		'let foo="foo"',
		'<div></div>',
		'let cat="cat"'
	)
	.expect(
		a.variable('foo', a.literal('foo')),
		a.xml('div'),
		a.variable('cat', a.literal('cat'))
	)

test('variable declaration inside div')
	.code('<div>let cat="cat"</div>')
	.expect(a.xml('div', null, [[a.variable('cat', a.literal('cat'))]]))

test('null value')
	.code('null')
	.expect(a.null())

test('function arguments')
	.code('let fun = function(arg1, arg2) { return arg1 + arg2 }', 'fun(1, 2)')
	.expect(
		a.variable('fun', a.function([a.argument('arg1'), a.argument('arg2')], [
			a.return(
				a.composite(a.reference('arg1'), '+', a.reference('arg2'))
			)
		])),
		a.invocation(a.reference('fun'), a.literal(1), a.literal(2))
	)

test('if/else in a div')
	.code(
		'<div> if Mouse.x is >= 100 { "mouse.x is >= 100" }',
		'else { "mouse.x is < 100" }</div>')
	.expect(
		a.xml('div', null, [
			a.ifElse(a.composite(a.reference('Mouse.x'), '>=', a.literal(100)), [
				a.literal('mouse.x is >= 100')
			], [
				a.literal('mouse.x is < 100')
			])
		])
	)

test('script tag in function parses')
	.code(
		'let foo = function(qwe) {',
		'	<script missing=missing>',
		'	</script>',
		'	return 1',
		'}')
	.expect(
		a.variable('foo', a.function(['qwe'], [
			a.inlineScript({ missing:'missing' }),
			a.return(a.literal(1))
		]))
	)

test('for loop over object literal')
	.code('for foo in { bar:"bar", cat:"cat" } {}')
	.expect(
		a.forLoop('foo', a.literal({ bar:'bar', cat:'cat' }), [])
	)

test('double declaration')
	.code(
		'let foo = 1,',
		'	bar = 2'
	).expect(a.variable('foo', a.literal(1)), a.variable('bar', a.literal(2)))

test('if, else if, else')
	.code(
		'if (false) { "qwe" }',
		'else if (true) { "foo" }',
		'else { "cat" }'
	).expect(
		a.ifElse(a.literal(false), a.literal("qwe"), a.ifElse(a.literal(true), a.literal("foo"), a.literal("cat")))
	)

/* Util
 ******/
function test(name) {
	util.resetUniqueID()
	var input
	return {
		code: function() {
			util.resetUniqueID()
			input = slice(arguments).join('\n')
			return this
		},
		expect: function() {
			var expected = slice(arguments),
				tokens = tokenizer.tokenize(input)
			module.exports['parse\t\t"'+name+'"'] = function(assert) {
				util.resetUniqueID()
				try { var output = parser.parse(tokens) }
				catch(e) { console.log("Parser threw"); throw e; }
				assert.deepEqual(expected, output)
				assert.done()
			}
			return this
		}
	}
}

/* Old, typed tests
 ******************/
// test('interface declarations')
// 	.code(
// 		'let Thing = { foo:Text, bar:Number }',
// 		'let ListOfThings=[ Thing ]',
// 		'let ListOfNumbers = [Number]',
// 		'let NumberInterface = Number'
// 	)
// 	.expect(
// 		a.declaration('Thing', a.interface({ foo:a.Text, bar:a.Number })),
// 		a.declaration('ListOfThings', a.interface([a.alias('Thing')])),
// 		a.declaration('ListOfNumbers', a.interface([a.Number])),
// 		a.declaration('NumberInterface', a.Number)
// 	)
// 
// test('typed value declarations')
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
// 
// test('explicit interface declarations')
// 	.code(
// 		'let Thing = { foo:Text, bar:Number }',
// 		'let Thing thing = null',
// 		'thing'
// 	)
// 	.expect(
// 		a.declaration('Thing', a.interface({ foo:a.Text, bar:a.Number })),
// 		a.declaration('thing', a.null, a.alias('Thing')),
// 		a.alias('thing')
// 	)
// 
// test('type-inferred function invocation')
// 	.code(
// 		'let Response = { error:Text, result:Text }',
// 		'let post = function(Text path, Anything params) {',
// 		'	return { error:"foo", response:"bar" }',
// 		'}',
// 		'let response = post("/test", { foo:"bar" })'
// 	)
// 	.expect(
// 		a.declaration('Response', a.interface({ error:a.Text, result:a.Text })),
// 		a.declaration('post', a.function([a.argument('path', a.Text), a.argument('params', a.Anything)], [
// 			a.return(a.object({ error:a.literal('foo'), response:a.literal('bar') }))
// 		])),
// 		a.declaration('response', a.invocation(a.alias('post'), a.literal('/test'), a.object({ foo:a.literal('bar')})))
// 	)
// 
// let Thing = { num:Number, foo:{ bar:[Text] }}
// let Number five = 5
// let Thing thing = { num:five, foo:{ bar:"cat" }}
// let { num:Number, foo:{ bar:Text } } thing = { num:five, foo:{ bar:"cat" }}
// let fun = function(Thing thing, { num:Number, foo:Text } alt) { ... }
// let Response post = function(path, params) { return XHR.post(path, params) }
// let response = post('/path', { foo:'bar' })
// assert response.type == Response
// let tar = XHR.post("/test", { foo:'bar' })
// let Response tar = XHR.post("/test", { foo:'bar' })
// let { error:String, result:String } tar = XHR.post("/test", { foo:'bar' })
