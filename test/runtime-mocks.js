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
		var chain = chainStr.split('.')
		while (chain.length) {
			value = expressions.dereference(value, expressions.Text(chain.shift()))
		}
		return value
	},
	null:expressions.Null
}
