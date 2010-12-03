var Types = exports,
	fs = require('fs'),
	util = require('../util')

/* List type definitions
 ***********************/
Types.definitions = util.pick(fs.readdirSync(__dirname), function(item) {
	var jsFileMatch = item != 'index.js' && item.match(/^(.*)\.js$/)
	return jsFileMatch && require(__dirname+'/'+jsFileMatch[1])
})

Types.byName = {}
util.each(Types.definitions, function(definition) {
	Types.byName[definition.name] = definition
})

/* Infer/reduce possible types
 *****************************/
var inferredTypes = {}
function getValueID(valueAST) {
	switch(valueAST.type) {
		case 'STATIC_VALUE':     return valueAST.valueType + ':' + valueAST.value
		case 'ITEM_PROPERTY':    return 'item_property:' + valueAST.item.id + ':' + valueAST
		case 'RUNTIME_ITERATOR': return 'iterator:' + getValueID(valueAST.iterable)
		default:                 console.log(valueAST); UNDEFINED_VALUEAST
	}
}

Types.get = function(ast) {
	if (ast.type == 'RUNTIME_ITERATOR') {
		ast = ast.iterable
	}
	var valueID = getValueID(ast)
	return inferredTypes[valueID] || []
}
Types.infer = function(ast, possibleTypes) {
	var valueID = getValueID(ast)
	if (!inferredTypes[valueID]) { inferredTypes[valueID] = possibleTypes }
	else { inferredTypes[valueID] = intersection(inferredTypes[valueID], possibleTypes) }
	return ast
}
Types.inferByMethod = function(ast, method) {
	return util.pick(Types.definitions, function(definition) {
		if (ast.method in definition.mutations) {
			return definition.name
		}
	})
}
function intersection(a, b) {
	var result = []
	for (var i=0; i<a.length; i++) {
		if (b.indexOf(a[i]) >= 0) { result.push(a[i]) }
	}
	return result
}

/* Determine a type based on inferred possible types
 ***************************************************/
var inferenceOrder = ['Text', 'Number']
Types.decide = function(ast) {
	var possibleTypes = inferredTypes[getValueID(ast)]
	if (possibleTypes.length > 1) { suggest() }
	return util.pickOne(inferenceOrder, function(inferedType) {
		if (possibleTypes.indexOf(inferedType) != -1) { return orderedType }
	}) || possibleTypes.sort()[0]
}
