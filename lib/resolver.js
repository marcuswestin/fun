/* The resolver primarily does three things:
 * 1) Resolve import statements by injecting declarations from
 *    the imported module into the main context's alias table
 * 2) Resolve aliases to balues
 * 3) Infer the type of and type check all values
 * The resolver returns an AST with no import statements and
 * no aliases, in which all values have been annotated with a type
 *****************************************************************/

var fs = require('fs'),
	path = require('path'),
	std = require('std')

var tokenizer = require('./tokenizer'),
	parser = require('./parser'),
	info = require('./info')

var util = require('./util'),
	bind = util.bind,
	map = util.map,
	each = util.each,
	log = util.log,
	assert = util.assert,
	halt = util.halt

exports.resolve = function(ast, context) {
	if (!context) {
		context = { imports:{}, aliases:{}, declarations:[] }
	}
	var expressions = util.cleanup(resolve(context, ast))
	return {
		expressions:expressions,
		declarations:context.declarations
	}
}

/************************
 * Top level statements *
 ************************/
var resolve = function(context, ast) {
	if (std.isArray(ast)) {
		return map(ast, bind(this, resolve, context))
	} else if (info.expressionTypes[ast.type]) {
		return _resolveExpression(context, ast)
	} else {
		return _resolveStatement(context, ast)
	}
}

var _resolveExpression = function(context, ast) {
	switch (ast.type) {
		case 'VALUE_LITERAL':        return ast
		case 'TEMPLATE_ARGUMENT':    return ast
		case 'INVOCATION':           return resolveInvocation(context, ast)
		case 'ALIAS':                return lookup(context, ast)
		case 'RUNTIME_ITERATOR':     return ast
		case 'COMPOSITE':            return resolveCompositeExpression(context, ast)
		case 'STATIC':               return ast
		case 'OBJECT_LITERAL':       return _resolveObjectLiteral(context, ast)
		default:                     log(ast.type); UNKNOWN_EXPRESSION_TYPE
	}
}

function _resolveObjectLiteral(context, ast) {
	if (ast.resolved) { return ast }
	ast.resolved = {}
	for (var i=0, kvp; kvp = ast.content[i]; i++) {
		ast.resolved[kvp.name] = resolve(context, kvp.value)
		ast.resolved[kvp.name] = declare(context, ast.resolved[kvp.name])
	}
	delete ast.content
	return ast
}

var _resolveStatement = function(context, ast) {
	switch(ast.type) {
		case 'IMPORT_MODULE':        handleModuleImport(context, ast)      ;break
		case 'IMPORT_FILE':          handleFileImport(context, ast)        ;break
		case 'DECLARATION':          handleDeclaration(context, ast)       ;break
		
		case 'XML':                  return resolveXML(context, ast)
		case 'IF_STATEMENT':         return resolveIfStatement(context, ast)
		case 'SWITCH_STATEMENT':     return resolveSwitchStatement(context, ast)
		case 'FOR_LOOP':             return resolveForLoop(context, ast)
		
		case 'MUTATION':             return resolveMutation(context, ast)
		case 'MUTATION_DECLARATION': handleDeclaration(context, ast)       ;break
		
		case 'HANDLER':              resolve(addScope(context), ast.block); return ast // Inline handler
		case 'DEBUGGER':             return ast
		
		default:                     halt(ast, '_resolveStatement: Unkown AST type "'+ast.type+'"')
	}
}

/******************
 * Lookup aliases *
 ******************/
var lookup = function(context, ast, allowMiss) {
	if (ast.type != 'ALIAS') { return ast }
	return _resolveNamespace(context, ast, allowMiss)
}

var _resolveNamespace = function(context, ast, allowMiss) {
	var chain = ast.namespace.slice(0),
		soFar = []
	
	var name = chain.shift()
	
	assert(ast, context.aliases[name], '"'+name+'"'+(ast.namespace.length > 1 ? ' of '+ast.namespace.join('.') : '') +' is not defined. Try something like "let '+name+' = \'foo\'".')
	
	var value = context.aliases[name]
	soFar.push(name)
	
	while (chain.length) {
		name = chain.shift()
		assert(ast, value.type == 'OBJECT_LITERAL', soFar.join('.')+' of '+ast.namespace.join('.')+' is a '+value.type+' and doesn\'t have a '+name)
		assert(ast, value.resolved[name], soFar.join('.')+' doesn\'t have a property named "'+name+'"')
		value = value.resolved[name]
	}
	
	return value
	// 	switch(value.type) {
	// 		case 'RUNTIME_ITERATOR':
	// 			return util.create(value, { iteratorProperty: namespace.slice(i+1).join('.') })
	// 		case 'TEMPLATE_ARGUMENT':
	// 			return util.create(value, { property:namespace.slice(i+1).join('.') })
	// 		case 'JAVASCRIPT_BRIDGE':
	// 			return value
	// 		case 'ALIAS':
	// 			return _lookupAlias(context, value)
	// 		default:
	// 			return value
	// 	}
	// }
	// 
	// assert(ast, allowMiss, 'Lookup of undeclared alias "'+namespace.join('.')+'"')
}

/************************
 * Composite expressions *
 ************************/
var resolveCompositeExpression = function(context, ast) {
	ast.left = resolve(context, ast.left)
	ast.right = resolve(context, ast.right)
	return ast
}

/*******
 * XML *
 *******/
var resolveXML = function(context, ast) {
	_resolveXMLAttributes(context, ast.attributes)
	ast.block = resolve(context, ast.block)
	return ast
}

var _resolveXMLAttributes = function(context, attributes) {
	var i = 0, attrAST,
		dataAttr, dataTypeAttr
	while (attrAST = attributes[i]) {
		var valueType = attrAST.value.type,
			attributeName = attrAST.namespace.join('.')
		if (attrAST.value.type == 'ALIAS') {
			attrAST.value = attributes[i] = lookup(context, attrAST.value)
		}
		if (attrAST.value.type == 'OBJECT_LITERAL') {
			var nestedAttrs = map(attrAST.value.content, function(kvp) {
				var value = resolve(context, kvp.value)
				return { namespace:attrAST.namespace.concat(kvp.name), value:value }
			})
			// splice out the nestedAST rather than increment i
			attributes.splice.apply(attributes, [i, 1].concat(nestedAttrs))
		} else {
			i++
		}
		
		if (attributeName == 'dataType') { dataTypeAttr = attrAST }
		else if (attributeName == 'data') { dataAttr = attrAST }
		else if (attributeName.match(/on\w+/)) { resolve(context, attrAST.value) } // resolve the code in the handler
	}
	if (dataTypeAttr) {
		assert(dataTypeAttr, !!dataAttr, 'Found dataType attribute but no data attribute')
		var value = dataTypeAttr.value
		assert(dataTypeAttr, value.type == 'STATIC' && value.valueType == 'string', 'dataType should be a static string, like "number"')
		dataAttr.dataType = value.value.toLowerCase()
	}
}

/*******************************
 * Imports (modules and files) *
 *******************************/
var handleModuleImport = function(context, ast) {
	if (context.imports[ast.name]) { return }
	var module = context.imports[ast.name] = { name: ast.name, path: __dirname + '/Modules/' + ast.name + '.fun' }
	assert(ast, fs.statSync(module.path).isFile(), 'Could not find module "'+ast.name+'" at ' + module.path)
	_importFile(module.path, context)
}

var handleFileImport = function(context, ast) {
	// TODO resolve files relative to current file path
	var filePath = path.resolve(process.cwd() + '/examples/' + ast.path + '.fun')
	if (context.imports[filePath]) { return }
	assert(ast, path.existsSync(filePath), 'Could not find file for import: "'+filePath+'"')
	_importFile(filePath, context)
}

var _importFile = function(path, context) {
	var tokens = tokenizer.tokenizeFile(path),
		newAST = parser.parse(tokens)
	resolve(context, newAST)
}

/***************
 * Invocations *
 ***************/
var resolveInvocation = function(context, ast) {
	var invocable = lookup(context, ast.alias),
		type = invocable.type
	assert(ast, type == 'TEMPLATE' || type == 'HANDLER', 'Invocations require a template or a handler. "'+ast.alias.namespace+'" is a '+type)
	ast.arguments = resolve(context, ast.arguments)
	var invocationContext = addScope(invocable.closure),
		signature = invocable.signature
	
	assert(ast.arguments, ast.arguments.length == signature.length, 'Expected '+signature.length+' arguments but found '+ast.arguments.length)
	each(signature, function(signatureAST, i) {
		var argument = ast.arguments[i],
			type = argument.valueType
		assert(argument, type, 'Expected value of invocation to have a value type associated with it')
		if (signatureAST.inferredType) {
			assert(argument, type == signatureAST.inferredType, 'Expected argument of type '+signatureAST.inferredType+' but found ' + type)
		} else {
			signatureAST.inferredType = type
		}
		_declareAlias(signature, invocationContext, signatureAST.name, argument)
	})
	
	if (!invocable.resolve) {
		invocable.resolved = true
		invocable.block = resolve(context, invocable.block)
	}
	
	return ast
}

/*************
 * Mutations *
 *************/
var resolveMutation = function(context, ast) {
	ast.args = map(ast.args, bind(this, lookup, context))
	ast.value = lookup(context, ast.alias, true)
	
	// HACK For Javascript bridges, the method ("connect" in Facebook.connect()),
	//  gets popped off of the namespace in _parseInvocation. Try to look up
	//  ast.alias + ast.method and check to see if it maps to a javascript bridge.
	//  If it does, then go with that. Possibly, _parseInvocation could not pop off
	//  the last part of the namespace and interpret it as the method. However, that
	//  would require the resolver or the compiler to detect item property mutations,
	//  and pop off the last part of the namespace for method then. This works for now.
	if (!ast.value) {
		ast.alias.namespace.push(ast.method)
		var lookForJSBridge = lookup(context, ast.alias)
		if (lookForJSBridge.type == 'JAVASCRIPT_BRIDGE') {
			ast.value = lookForJSBridge
		}
	}
	
	delete ast.alias
	
	return ast
}

/*************
 * For loops *
 *************/
var resolveForLoop = function(context, ast) {
	ast.iteratorRuntimeName = ast.iterator.value.runtimeName = util.name('RUNTIME_ITERATOR_NAME')
	ast.iterable = lookup(context, ast.iterable)
	ast.iterator.value.iterable = ast.iterable
	var loopContext = addScope(context)
	handleDeclaration(loopContext, ast.iterator)
	ast.block = resolve(loopContext, ast.block)
	return ast
}

/*****************
 * If statements *
 *****************/
var resolveIfStatement = function(context, ast) {
	ast.condition = resolve(context, ast.condition)
	ast.ifBlock = resolve(addScope(context), ast.ifBlock)
	if (ast.elseBlock) {
		ast.elseBlock = resolve(addScope(context), ast.elseBlock)
	}
	return ast
}

/*********************
 * Switch statements *
 *********************/
var resolveSwitchStatement = function(context, ast) {
	ast.controlValue = resolve(context, ast.controlValue)
	each(ast.cases, function(aCase) {
		aCase.values = map(aCase.values, bind(this, resolve, context))
		each(aCase.values, function(aCase) {
			assert(aCase, aCase.type == 'STATIC', "Switch statements' case values must be numbers (e.g. 2, 3, 4) or text (e.g. 'hello')")
		})
		aCase.statements = map(aCase.statements, bind(this, resolve, context))
	})
	var defaultCases = util.pick(ast.cases, function(aCase) { return aCase.isDefault })
	assert(ast, defaultCases.length < 2, "Found two default cases in switch statement - well, that doesn't make sense")
	return ast
}

/****************
 * Declarations *
 ****************/
var handleDeclaration = function(context, ast) {
	var value = lookup(context, ast.value)
	value = declare(context, value)
	assert(ast, value, 'Declaration without a value')
	_declareAlias(ast, context, ast.name, value)
}
var declare = function(context, value) {
	if (value.type == 'OBJECT_LITERAL') {
		// Object literals should not get assigned a unique ID or be listed as a declaration,
		// since they do not represent actual values (but rather a collection of values)
		_resolveObjectLiteral(context, value)
		return value
	}
	if (value.uniqueID) { return value }
	value.uniqueID = util.uniqueID()
	
	switch(value.type) {
		case 'TEMPLATE':
		case 'HANDLER':
			value.closure = context
			each(value.signature, function(argument) {
				argument.runtimeName = util.name('INVOCABLE_ARGUMENT_NAME')
			})
			break
		case 'MUTATION_ITEM_CREATION':
			each(value.properties.content, function(prop) {
				prop.value = lookup(context, prop.value)
			})
			break
		case 'JAVASCRIPT_BRIDGE':
			// do nothing
			break
		case 'VALUE_LITERAL':
			value = Object.create(value)
			value.type = 'VALUE'
			value.initialValue = value.value
			value.valueType = typeof value.initialValue
			break
		default:
			throw new Error('Unknown declaration value type: "'+value.type+'"')
	}

	switch (value.type) {
		case 'VALUE':
		// case 'TEMPLATE':
		context.declarations.push(value)
	}
	return value
}
var _declareAlias = function(ast, context, name, valueAST) {
	valueAST = lookup(context, valueAST)
	assert(ast, !context.aliases[name], 'Repeat declaration of "'+name+'"')
	assert(ast, valueAST, 'Declaration of undefined value')
	context.aliases[name] = valueAST
}

/***********
 * Utility *
 ***********/
var addScope = function(context) {
	// Creates a scope by prototypically inheriting from the current context.
	// Reads will propegate up the prototype chain, while writes won't.
	// However, writes *will* shadow values up the prototype chain
	context = util.create(context)
	context.aliases = util.shallowCopy(context.aliases)
	return context
}
