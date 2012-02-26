var expressions = require('../src/runtime/expressions'),
	proto = require('std/proto')

module.exports = {
	variable:function variable(initialContent) {
		return expressions.variable(expressions.fromJsValue(initialContent))
	},
	value:expressions.fromJsValue,
	composite:function(left, operator, right) {
		return expressions.composite(expressions.fromJsValue(left), operator, expressions.fromJsValue(right))
	},
	reference:function(value, chainStr) {
		return expressions.reference(value, chainStr.split('.'))
	},
	null:expressions.Null
}
