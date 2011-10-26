var std = require('std'),
	tokenizer = require('../../lib/tokenizer'),
	parser = require('../../lib/parser'),
	resolver = require('../../lib/resolver'),
	compiler = require('../../lib/compiler'),
	a = require('../ast-mocks')

test('a number and a string').code(
	'"Hello " 1')

test('a declaration and reference').code(
	'let foo = "bar"',
	'foo')

test('object literals').code(
	'let foo = { nested: { bar:1 } }',
	'let nested = foo.nested',
	'foo foo.nested nested foo.nested.bar')

/* Util
 ******/
function test(name) {
	return {
		code: function() {
			var code = std.slice(arguments).join('\n'),
				tokens = tokenizer.tokenize(code),
				parsedAST = parser.parse(tokens),
				resolvedAST = resolver.resolve(parsedAST)
			
			module.exports['compile\t\t"'+name+'"'] = function(assert) {
				try { compiler.compile(resolvedAST) }
				catch(e) { console.log("compiler threw:", e.stack); throw e }
				assert.done()
			}
			return this
		}
	}
}
