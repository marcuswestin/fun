module.exports = {
	variable:variable,
	value:value
}

function variable(initialContent) {
	return {
		type: 'VARIABLE',
		subscribers: {},
		content:value(initialContent)
	}
}

function value(content) {
	switch(typeof content) {
		case 'string':
		case 'number':
		case 'boolean': return { type:'VALUE_LITERAL', content:content }
		case 'object':
			if (!content) { return { type:'VALUE_LITERAL', content:null } }
			var objectContent = {}
			for (var key in content) { objectContent[key] = value(content[key]) }
			return { type:'OBJECT_LITERAL', content:objectContent }
	}
}
