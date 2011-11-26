var mocks = require('./ast-mocks'),
	runtimeValues = require('../src/runtime/values')

var a = module.exports = Object.create(mocks)

a.variable = function variable(initialContent) {
	return {
		type: 'VARIABLE',
		observers: {},
		content:a.value(initialContent)
	}
}

a.value = function value(content) {
	var type = typeof content
	switch(type) {
		case 'string':
		case 'number':
		case 'boolean': return runtimeValues[type](content)
		case 'object':
			if (!content) { return { type:'VALUE_LITERAL', content:null } }
			var objectContent = {}
			for (var key in content) { objectContent[key] = value(content[key]) }
			return { type:'OBJECT_LITERAL', content:objectContent }
	}
}
