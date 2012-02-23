var mocks = require('./ast-mocks'),
	expressions = require('../src/runtime/expressions')

var a = module.exports = Object.create(mocks)

a.variable = function variable(initialContent) {
	return expressions.variable(a.value(initialContent))
}

a.value = expressions.fromJsValue

a.composite = expressions.composite
