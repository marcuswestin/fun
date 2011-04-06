var std = require('std'),
	compiler = require('../../lib/compiler'),
	a = require('../astMocks')
 
test('compiles something', a.static(1), function(output, assert) {
	assert.ok(!!std.strip(output))
})

/* UTIL */
var nameCount
function test(name, ast, fn) {
	nameCount = nameCount + 1 || 1
	module.exports[name+' '+nameCount] = function(assert) {
		var output = compile(ast)
		fn(output, assert)
		assert.done()
	}
}

function compile(ast) {
	return compiler.compileRaw(ast)
}
