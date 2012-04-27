var compiler = require('../../src/compiler'),
	http = require('http'),
	zombie = require('zombie'),
	compilerServerPort = 9797,
	slice = require('std/slice'),
	each = require('std/each'),
	hasClass = require('dom/hasClass')

var currentTestCode, compilerServer
	
startCompilerServer()

test('a number and a string').code(
	'<div id="output">"Hello " 1</div>')
	.textIs('#output', 'Hello 1')

test('a variable in a div').code(
	'foo = "foo"',
	'<div id="output">foo</div>')
	.textIs('#output', 'foo')

test('clicking a button updates the UI').code(
	'foo = "bar"',
	'<div id="output">foo</div>',
	'<button id="button"></button onClick=handler() {',
	'	foo set: "cat"',
	'}>')
	.textIs('#output', 'bar')
	.click('#button')
	.textIs('#output', 'cat')

test('object literals').code(
	'foo = { nested: { bar:1 } }',
	'<div id="output">foo foo.nested foo.nested.bar</div>')
	.textIs('#output', '{ "nested":{ "bar":1 } }{ "bar":1 }1')

test('divs follow mouse').code(
	'import mouse',
	'<div id="output1" style={ position:"absolute", top:mouse.y, left:mouse.x }/>',
	'<div id="output2" style={ position:"absolute", top:mouse.y + 50, left:mouse.x + 50 }/>')
	.moveMouse(100, 100)
	.positionIs('#output1', 100, 100)
	.positionIs('#output2', 150, 150)

test('script tag variable passing').code(
	'foo = "foo"',
	'<script fooVariable=foo>',
	'	fooVariable.mutate("set", [fun.expressions.Text("bar")])',
	'</script>',
	'<div id="output">foo</div>')
	.textIs('#output', 'bar')

test('variable declaration inside div').code(
	'<div>',
	'	cat = "cat"',
	'	<div id="output">cat</div>',
	'</div>')
	.textIs('#output', 'cat')
	
test('changing object literals').code(
	'foo = { a:1 }',
	'<div id="output">',
	'	{ foo: { a:foo.a } }',
	'	{ a:foo.a }',
	'	foo',
	'</div onclick=handler(){ foo set: "a", 2 }>')
	.textIs('#output', '{ "foo":{ "a":1 } }{ "a":1 }{ "a":1 }')
	.click('#output')
	.textIs('#output', '{ "foo":{ "a":2 } }{ "a":2 }{ "a":2 }')

test('null values').code(
	'foo=null',
	'<div id="output">"null:"foo " null:"null</div>')
	.textIs('#output', 'null: null:')

test('function invocation').code(
	'fun = function() { return 1 }',
	'<div id="output">fun()</div>')
	.textIs('#output', '1')

test('function argument').code(
	'fun = function(arg) { return arg }',
	'<div id="output">fun(1) fun("hello")</div>')
	.textIs('#output', '1hello')

test('statements after return do not evaluate').code(
	'fun = function() {',
	'	return 1',
	'	return 2',
	'}',
	'<div id="output">fun()</div>')
	.textIs('#output', '1')

test('if/else in a div -> if branch').code(
	'foo = 120',
	'<div id="output"> if foo is >= 100 { "foo is >= 100" }',
	'else { "foo is < 100" }</div>')
	.textIs('#output', 'foo is >= 100')

test('if/else in a div -> else branch').code(
	'foo = 120',
	'<div id="output">',
	'	if foo is < 100 { "foo is < 100" }',
	'	else { "foo is >= 100" }',
	'</div>')
	.textIs('#output', 'foo is >= 100')

test('if/else in a div -> first if branch, then else branch').code(
	'foo = 120',
	'<div id="output">',
	'	if foo is < 100 { "foo is < 100" }',
	'	else { "foo is >= 100" }',
	'</div>',
	'<button id="lower" onclick=handler(){ foo set: 80 } />',
	'<button id="higher" onclick=handler(){ foo set: 120 } />')
	.textIs('#output', 'foo is >= 100')
	.click('#lower')
	.textIs('#output', 'foo is < 100')
	.click('#higher')
	.textIs('#output', 'foo is >= 100')


test('returning an argument reference from a function').code(
	'fun = function(arg) { return arg.foo }',
	'<div id="output">fun({ foo:"bar" })</div>')
	.textIs('#output', 'bar')

test('function with script that mutates return value 1').code(
	'fun = function() { <script>yieldValue(fun.expressions.Number(1))</script> }',
	'<div id="output">fun()</div>')
	.textIs('#output', 1)

test('function with script that mutates return value 2').code(
	'fun = function() { <script>yieldValue(1)</script> }',
	'<div id="output">fun()</div>')
	.textIs('#output', 1)

test('function returns closure value').code(
	"bar = 'qwe'",
	"fun = function() { return bar }",
	"<div id='output'>fun()</div>")
	.textIs('#output', "qwe")

test('mutation of variable returned from closure propegates').code(
	'foo = "ASD"',
	'fun = function() { return foo }',
	'<div id="output">fun()</div onclick=handler() { foo set: "QWE" }>')
	.textIs('#output', 'ASD')
	.click('#output')
	.textIs('#output', 'QWE')

test('if, else if, else').code(
	'foo = "qwe"',
	'<div id="output">',
	'if false { "case1" }',
	'else if foo is = "asd" { "case2" }',
	'else { "case3" }',
	'</div>',
	'<button id="button" onclick=handler(){ foo set: "asd" }/>')
	.textIs('#output', 'case3')
	.click('#button')
	.textIs('#output', 'case2')

test('binary operator expression with invocation').code(
	'foo = function() { return 2 }',
	'<div id="output">1 + foo() + 3</div>')
	.textIs('#output', 6)

test('template invocations with arguments').code(
	'greet = template(name) { "hello "+name }',
	'<div id="output">greet("foo") greet("bar") " " greet("cat")</div>')
	.textIs('#output', 'hello foohello bar hello cat')

test('template argument mutation mutates emission').code(
	'emit = template(arg) { arg }',
	'foo = "bar"',
	'<div id="output">',
	'	emit(foo)',
	'</div onclick=handler(){ foo set: "cat" }>')
	.textIs('#output', 'bar')
	.click('#output')
	.textIs('#output', 'cat')

test('variable in template closure updates the template emission when the variable mutates').code(
	'foo = "bar"',
	'<div id="output">',
	'	qwe = template() { foo }',
	'	qwe()',
	'</div onclick=handler(){ foo set: "cat" }>')
	.textIs('#output', 'bar')
	.click('#output')
	.textIs('#output', 'cat')

test('multiple class name attributes').code(
	'<div id="target" class="foo" class="bar" />')
	.hasClass('#target', 'foo', 'bar')

test('a variable mutation replaces old class name').code(
	'foo = "foo"',
	'<div id="target" class=foo class="cat" onclick=handler() { foo set:"bar" } />')
	.hasClass('#target', 'foo', 'cat')
	.click('#target')
	.doesntHaveClass('#target', 'foo')
	.hasClass('#target', 'bar', 'cat')

test('xml attribute hash expansion').code(
	'attrs = { id:"foo" class:"bar" } ',
	'<div #attrs class="cat" />')
	.hasClass('#foo', 'bar', 'cat')

test('null list length').code(
	'foo = [null]',
	'<div id="output">foo.length</div>')
	.textIs("#output", '1')

test('dictionary set property').code(
	'foo = 1',
	'bar = { foo:foo }',
	'<div id="output">foo bar.foo</div onclick=handler() { bar set:"foo", 2 }>')
	.click('#output')
	.textIs('#output','12')

test('dynamic dereference').code(
	'foo = "a" bar={ a:1, b:2 }',
	'<div id="output">bar[foo]</div onclick=handler() { foo set: "b" }>')
	.textIs('#output', 1)
	.click('#output')
	.textIs('#output', 2)

test('dereference on grouped expression').code(
	'<div id="output">({ foo:"bar" }).foo</div>')
	.textIs('#output', 'bar')

test('dereference on inline function invocation').code(
	'<div id="output">function() { return { foo:"bar" } }().foo</div>')
	.textIs('#output', 'bar')

test('dereference on inline function invocation #2').code(
	'<div id="output">function() { return { foo:function(arg) { return arg } } }().foo("bar")</div>')
	.textIs('#output', 'bar')

test('list.first/last properties').code(
	'foo = ["a","b","c"]',
	'<div id="output">foo.first foo.last</div onclick=handler() { foo push: "d" }>')
	.textIs('#output', 'ac')
	.click('#output')
	.textIs('#output', 'ad')

test("a variable's type changes as the underlying value mutates").code(
	'foo = "qwe"',
	'<div id="output">foo.Type</div onclick=handler() { foo set:1 }>')
	.textIs('#output', 'Text')
	.click('#output')
	.textIs('#output', 'Number')

test("list length as items get added").code(
	'foo = ["a"]',
	'<div id="output">foo.length</div onclick=handler() { foo push: "b" }>')
	.textIs("#output", '1')
	.click('#output')
	.textIs('#output', '2')

test("copy of grouped expression (foo + 1).copy()").code(
	'foo = 1',
	'<div id="output">foo</div onclick=handler() { foo set: (foo + 2).copy() }>')
	.click('#output')
	.textIs('#output', '3')

test("app.whenLoaded fires").code(
	'import app',
	'foo = 1',
	'<div id="output">foo</div>',
	'app.whenLoaded(handler() { foo set:2 })')
	.textIs('#output', '2')

test("time.after fires").code(
	'import time',
	'foo = 1',
	'<div id="output">foo</div>',
	'time.after(10, handler() { foo set:2 })')
	.wait(20)
	.textIs('#output', '2')

/* Util
 ******/
var isFirstTest = true
function test(name) {
	var actionHandlers = createActionHandlers()
	var testObj = {
		code: function() {
			var code = slice(arguments).join('\n'),
				actions = this._actions = []
			
			module.exports['compile\t"'+name+'"'] = function(assert) {
				if (isFirstTest) { console.log('loading headless browser - hang tight!'); isFirstTest = false }
				
				currentTestCode = code
				
				try { runTest() }
				catch(e) { onError(e) }
				
				function runTest() {
					// First make sure that compilation succeeds
					compiler.compileCode(currentTestCode, { minify:false }, function(err) {
						if (err) { return onError(err) }
						
						zombie.visit('http://localhost:'+compilerServerPort, { debug:false }, function(err, browser) {
							if (err || browser.statusCode != 200) {
								onError(new Error("Error: " + err + " " + browser.statusCode + " " + browser.errors + " " + browser.dump()))
							}
							;(function nextAction() {
								if (!actions.length) {
									assert.done()
									scheduleCompilerServerShutdown()
									return
								}
								var action = actions.shift()
								try {
									actionHandlers[action.name].apply(this, [assert, browser, nextAction].concat(action.args))
								} catch(e) {
									console.log('compiler threw -', e.stack, '\n\nThe test code that caused the error:\n', currentTestCode)
								}
							})()
						})
					})
				}
				
				function onError(e) {
					console.log(e.stack || e)
					process.exit()
				}
			}
			return this
		}
	}
	
	each(actionHandlers, function(handler, name) {
		testObj[name] = function chainableAction() {
			this._actions.push({ name:name, args:slice(arguments) })
			return this
		}
	})
	
	return testObj
}

function createActionHandlers() {
	return {
		// Events
		click: function(assert, browser, next, selector) {
			var target = browser.querySelector(selector)
			browser.fire('click', target, next)
		},
		moveMouse: function(assert, browser, next, clientX, clientY) {
			var doc = browser.document,
				event = doc.createEvent('MouseEvents') // or HTMLEvents
			event.initEvent('mousemove', true, true)
			event.clientX = clientX
			event.clientY = clientY
			browser.dispatchEvent(doc, event)
			browser.wait(next)
		},
		// Asserts
		htmlIs: function(assert, browser, next, selector, expectedHTML) {
			assert.deepEqual(expectedHTML, browser.html(selector))
			next()
		},
		textIs: function(assert, browser, next, selector, expectedHTML) {
			assert.deepEqual(expectedHTML, browser.text(selector))
			next()
		},
		wait: function(assert, browser, next, amount) {
			setTimeout(next, amount || 0)
		},
		hasClass: function(assert, browser, next, selector/*, class1, class2, ... */) {
			var classNames = slice(arguments, 4)
			each(classNames, function(expectedClassName) {
				assert.ok(hasClass(browser.querySelector(selector), expectedClassName))
			})
			next()
		},
		doesntHaveClass: function(assert, browser, next, selector, expectedClass) {
			var classNames = slice(arguments, 4)
			each(classNames, function(expectedClassName) {
				assert.ok(!hasClass(browser.querySelector(selector), expectedClassName))
			})
			next()
		},
		positionIs: function(assert, browser, next, selector, x, y) {
			var style = browser.querySelector(selector).style
			assert.deepEqual(style.left, x+'px')
			assert.deepEqual(style.top, y+'px')
			next()
		}
	}
}

function startCompilerServer() {
	compilerServer = http.createServer(function(res, res) {
		try { runTest() }
		catch(e) { return onError(e) }
		
		function runTest() {
			compiler.compileCode(currentTestCode, { minify:false }, function(err, appHtml) {
				if (err) { return onError(err) }
				res.writeHead(200)
				res.end(appHtml)
			})
		}
		
		function onError(e) {
			console.log("compiler server error", e.stack)
			res.writeHead(500)
			res.end(e.stack)
		}
	})
	compilerServer.listen(compilerServerPort)
}

function scheduleCompilerServerShutdown() {
	clearTimeout(scheduleCompilerServerShutdown.timeout)
	scheduleCompilerServerShutdown.timeout = setTimeout(function() {
		console.log("Tests done, shutting down compiler server")
		compilerServer.close()
	}, 200)
}
