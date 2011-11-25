var std = require('std'),
	tokenizer = require('../../src/tokenizer'),
	parser = require('../../src/parser'),
	resolver = require('../../src/resolver'),
	compiler = require('../../src/compiler'),
	a = require('../ast-mocks'),
	http = require('http'),
	zombie = require('zombie'),
	compilerServerPort = 9797,
	slice = require('std/slice'),
	bind = require('std/bind')

var currentTestCode, compilerServer
	
startCompilerServer()

test('a number and a string').code(
	'<div>"Hello " 1</div>')
	.htmlIs('div', '<div>Hello 1</div>')

test('clicking a button updates the UI').code(
	'var foo = "bar"',
	'<div id="output">foo</div>',
	'<button id="button"></button onClick=handler() {',
	'	foo.set("cat")',
	'}>')
	.textIs('#output', 'bar')
	.click('#button')
	.textIs('#output', 'cat')

// test('value changes type')
// 	.compile(
// 		'let foo = "bar"',
// 		'<div id="value">foo</div>',
// 		'<div id="Type">foo.Type</div>',
// 		'<button id="button"></button onClick=handler() { foo.set(1) }>'
// 	)
// 	.textIs('#value', 'bar')
// 	.textIs('#Type', 'Text')
// 	.click('#button')
// 	.textIs('#value', 1)
// 	.textIs('#Type', 'Number')

test('object literals').code(
	'var foo = { nested: { bar:1 } }',
	'<div id="output">foo foo.nested foo.nested.bar</div>'
	)
	.textIs('#output', '{ nested:{ bar:1 } }{ bar:1 }1')

test('drag square with mouse').code(
	'import Mouse',
	'<div style={ width:100, height:100, background:"red", position:"absolute", top:Mouse.y, left:Mouse.x }/>'
	)

test('changing object literals').code(
	'var foo = { a:1 }',
	'<div id="output">',
	'	{ foo: { a:foo.a } }',
	'	{ a:foo.a }',
	'	foo',
	'</div onclick=handler(){ foo.a.set(2) }>'
	)
	.textIs('#output', '{ foo:{ a:1 } }{ a:1 }{ a:1 }')
	.click('#output')
	.textIs('#output', '{ foo:{ a:2 } }{ a:2 }{ a:2 }')

// test('drag square with mouse with composite offset').code(
// 	'import Mouse',
// 	'<div style={ width:100, height:100, background:"red", position:"absolute", top:Mouse.y + 50, left:Mouse.x + 50 }/>'
// 	)

// test('handler with logic')
// 	.code(
// 		'let cat = "hi1"',
// 		'let foo = handler() {',
// 		'	if (cat == "hi1") { cat.set("hi2") }',
// 		'	else { cat.set("hi3") }',
// 		'}',
// 		'<button id="button" onclick=foo/>',
// 		'<div id="output">cat</div>'
// 	)
// 	.textIs('#output', 'hi1')
// 	.click('#button')
// 	.textIs('#output', 'hi2')
// 	.click('#button')
// 	.textIs('#output', 'hi3')


/* Util
 ******/
var isFirstTest = true
function test(name) {
	return {
		code: function() {
			var code = std.slice(arguments).join('\n'),
				actions = this._actions = []
			
			module.exports['compile\t"'+name+'"'] = function(assert) {
				currentTestCode = code
				
				try {
					var tokens = tokenizer.tokenize(currentTestCode),
						parsedAST = parser.parse(tokens),
						resolvedAST = resolver.resolve(parsedAST),
						result = compiler._printHTML(compiler.compile(resolvedAST))
				} catch(e) {
					console.log(e.stack)
					process.exit()
				}
				
				if (isFirstTest) { console.log('loading headless browser - hang tight!'); isFirstTest = false }
				zombie.visit('http://localhost:'+compilerServerPort, function(err, browser, status) {
					if (err) { throw err }
					if (status != 200) { throw new Error("Got bad status from compiler server:", status) }
					var nextAction = function() {
						if (!actions.length) {
							assert.done()
							scheduleCompilerServerShutdown()
							return
						}
						var action = actions.shift()
						try {
							actionHandlers[action.name].apply(this, [assert, browser, nextAction].concat(action.args))
						} catch(e) {
							console.log('compiler threw:', e.stack, '\nThe code that caused the throw:\n', currentTestCode)
						}
					}
					nextAction()
				})
			}
			return this
		},
		htmlIs: chainableAction('htmlIs'),
		textIs: chainableAction('textIs'),
		click: chainableAction('click')
	}
}

function chainableAction(name) {
	return function() {
		this._actions.push({ name:name, args:slice(arguments) })
		return this
	}
}

var actionHandlers  = {
	click: function(assert, browser, next, selector) {
		var target = browser.querySelector(selector)
		browser.fire('click', target, next)
	},
	htmlIs: function(assert, browser, next, selector, expectedHTML) {
		assert.deepEqual(expectedHTML, browser.html(selector))
		next()
	},
	textIs: function(assert, browser, next, selector, expectedHTML) {
		assert.deepEqual(expectedHTML, browser.text(selector))
		next()
	}
}

function startCompilerServer() {
	compilerServer = http.createServer(function(res, res) {
		var tokens = tokenizer.tokenize(currentTestCode),
			parsedAST = parser.parse(tokens),
			resolvedAST = resolver.resolve(parsedAST)
		
		try { var result = compiler._printHTML(compiler.compile(resolvedAST)) }
		catch(e) { var error = e; }
		
		if (error) {
			console.log("compiler server error", error.stack)
			res.writeHead(500)
			res.end(error.stack)
		} else {
			res.writeHead(200, { 'Content-Length':result.length })
			res.end(result)
		}
	})
	compilerServer.listen(compilerServerPort)
}

function scheduleCompilerServerShutdown() {
	clearTimeout(scheduleCompilerServerShutdown.timeout)
	scheduleCompilerServerShutdown.timeout = setTimeout(function() {
		compilerServer.close()
	}, 100)
}
