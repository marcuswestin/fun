var mocks = require('./ast-mocks'),
	expressions = require('../src/runtime/expressions')

var a = module.exports = Object.create(mocks)

a.variable = function variable(initialContent) {
	return expressions.variable(a.value(initialContent))
}

a.value = function value(content) {
	var type = typeof content
	switch(type) {
		case 'string':
		case 'number':
		case 'boolean': return expressions[type](content)
		case 'object':
			if (!content) { return expressions.null() }
			var dictionaryContent = {}
			for (var key in content) { dictionaryContent[key] = value(content[key]) }
			return expressions.dictionary(dictionaryContent)
		default:
			throw new Error("ASDASD")
	}
}

a.composite = expressions.composite