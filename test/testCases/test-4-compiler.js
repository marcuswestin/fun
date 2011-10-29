var std = require('std'),
	tokenizer = require('../../lib/tokenizer'),
	parser = require('../../lib/parser'),
	resolver = require('../../lib/resolver'),
	compiler = require('../../lib/compiler'),
	a = require('../ast-mocks'),
	http = require('http'),
	zombie = require('zombie'),
	compilerServerPort = 9797,
	slice = require('std/slice'),
	bind = require('std/bind')

var currentTestCode, compilerServer
	
startCompilerServer()

test('a number and a string').compile(
	'<div>"Hello " 1</div>')
	.htmlIs('div', '<div>Hello 1</div>')

test('clicking a button updates the UI').compile(
	'let foo = "bar"',
	'<div id="output">foo</div>',
	'<button id="button"></button onClick=handler() {',
	'	foo.set("cat")',
	'}>')
	.htmlIs('#output', 'bar')
	.click('#button')
	.htmlIs('#output', 'cat')
// 
// test('a declaration and reference').compile(
// 	'let foo = "bar"',
// 	'<div>"foo = " foo</div>')
// 	.htmlIs('div', '<div>foo = bar</div>')
// 
// test('object literals').compile(
// 	'let foo = { nested: { bar:1 } }',
// 	'let nested = foo.nested',
// 	'foo foo.nested nested foo.nested.bar')

/* Util
 ******/
var isFirstTest = true
function test(name) {
	return {
		compile: function() {
			var code = std.slice(arguments).join('\n'),
				actions = this._actions = []
			
			module.exports['compile\t"'+name+'"'] = function(assert) {
				currentTestCode = code
				if (isFirstTest) { console.log('loading headless browser...'); isFirstTest = false }
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
