var std = require('std'),
	a = require('../astMocks'),
	resolver = require('../../lib/resolver')

test("resolves a declared alias to a local item property")
	.input(a.declaration('name', a.static("Marcus")), a.alias("name", "Marcus"))
	.expect(a.property(-1, ["__local_$1"], "Marcus"))

test("resolved empty XML")
	.input(a.xml('div', [], []))
	.expect(a.xml('div', [], []))

// a.forLoop(a.list(a.static(1), a.static(2), a.static(3)), 'iterator', [])
/* UTIL */
function test(name) {
	var inputAST
	var testObj = {
		input: function() {
			inputAST = std.slice(arguments)
			return testObj
		},
		expect: function() {
			var expectedAST = std.slice(arguments)
			module.exports['test resolver '+name] = function(assert) {
				var resolvedAST = resolve(inputAST)
				assert.deepEqual(resolvedAST, expectedAST)
				assert.done()
			}
		}
	}
	return testObj
}

function resolve(ast) {
	return resolver.resolve(ast).ast
}
