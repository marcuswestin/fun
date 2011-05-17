/* The resolver primarily does three things:
 * 1) Resolve import statements by injecting declarations from
 *    the imported module into the main context's alias table
 * 2) Resolve aliases to balues
 * 3) Infer the type of and type check all values
 * The resolver returns an AST with no import statements and
 * no aliases, in which all values have been annotated with a type
 *****************************************************************/

var fs = require('fs'),
	sys = require('sys'),
	path = require('path'),
	std = require('std')

var tokenizer = require('./tokenizer'),
	parser = require('./parser'),
	info = require('./info')

var util = require('./util'),
	bind = util.bind,
	map = util.map,
	each = util.each,
	log = util.log

exports.resolve = util.intercept('ResolveError', function(ast, context) {
	if (!context) {
		context = { modules:{}, declarations:[], fileDependencies:[], aliases: {} }
	}
	var ast = util.cleanup(resolve(context, ast))
	return {
		ast: ast,
		modules: context.modules,
		declarations: context.declarations,
		dependencies: context.dependencies
	}
})

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
		case 'TEMPLATE_ARGUMENT':    return ast
		case 'INVOCATION':           return resolveInvocation(context,ast)
		case 'ALIAS':                return lookup(context, ast)
		case 'RUNTIME_ITERATOR':     return ast
		case 'ITEM_PROPERTY':        return ast
		case 'COMPOSITE':            return resolveCompositeExpression(context, ast)
		case 'STATIC':               return ast
		default:                     log(ast.type); UNKNOWN_EXPRESSION_TYPE
	}
}

var _resolveStatement = function(context, ast) {
	switch(ast.type) {
		case 'IMPORT_MODULE':        handleModuleImport(context, ast)      ;break
		case 'IMPORT_FILE':          handleFileImport(context, ast)        ;break
		case 'DECLARATION':          handleDeclaration(context, ast)       ;break
		
		case 'CLASS_DECLARATION':    return resolveClassDeclaration(context, ast)
		case 'XML':                  return resolveXML(context, ast)
		case 'IF_STATEMENT':         return resolveIfStatement(context, ast)
		case 'SWITCH_STATEMENT':     return resolveSwitchStatement(context, ast)
		case 'FOR_LOOP':             return resolveForLoop(context, ast)
		
		case 'MUTATION':             return resolveMutation(context, ast)
		case 'MUTATION_DECLARATION': handleDeclaration(context, ast)       ;break
		
		case 'HANDLER':              resolve(createScope(context), ast.block); return ast // Inline handler
		case 'DEBUGGER':             return ast
		
		default:                     log(ast); UNKNOWN_AST_TYPE
	}
}

/******************
 * Lookup aliases *
 ******************/
var lookup = function(context, aliasOrValue, allowMiss) {
	if (aliasOrValue.type == 'OBJECT_LITERAL') {
		for (var i=0, prop; prop = aliasOrValue.content[i]; i++) {
			prop.value = lookup(context, prop.value, allowMiss)
		}
	}
	if (aliasOrValue.type != 'ALIAS') { return aliasOrValue }
	else { return _lookupAlias(context, aliasOrValue, allowMiss) }
}

var _lookupAlias = function(context, ast, allowMiss) {
	var lookupNamespace = [],
		namespace = ast.namespace,
		aliases = context.aliases
	
	for (var i=0; i < namespace.length; i++) {
		lookupNamespace.push(namespace[i])
		var namespaceKey = lookupNamespace.join('.'),
			value = aliases[namespaceKey]
		
		if (!value) { continue }
		
		switch(value.type) {
			case 'RUNTIME_ITERATOR':
				return util.create(value, { iteratorProperty: namespace.slice(i+1).join('.') })
			case 'TEMPLATE_ARGUMENT':
				return util.create(value, { property:namespace.slice(i+1).join('.') })
			case 'ITEM':
				return util.create(ast, { type: 'ITEM_PROPERTY', item:value, property:namespace.slice(i+1) })
			case 'JAVASCRIPT_BRIDGE':
				return value
			case 'ALIAS':
				return _lookupAlias(context, value)
			default:
				return value
		}
	}
	
	if (allowMiss) { return }
	else { halt(ast, 'Lookup of undeclared alias "'+namespace.join('.')+'"') }
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
		switch(attrAST.value.type) {
			case 'OBJECT_LITERAL':
				var nestedAttrs = map(attrAST.value.content, function(kvp) {
					var value = resolve(context, kvp.value)
					return { namespace:attrAST.namespace.concat(kvp.name), value:value }
				})
				// splice out the nestedAST rather than increment i
				attributes.splice.apply(attributes, [i, 1].concat(nestedAttrs))
				break
			case 'ALIAS':
				attrAST.value = lookup(context, attrAST.value)
				break
			default:
				i++
				break
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

/**********************
 * Class declarations *
 **********************/
var resolveClassDeclaration = function(context, ast) {
	// TODO Validate properties
	_declareAlias(context, ast, ast.name, ast)
	if (ast.name == 'Global') { _resolveGlobalDeclaration(context, ast) }
	return ast
}

var _resolveGlobalDeclaration = function(context, ast) {
	_declareAlias(context, ast, 'global', { type:'ITEM', id:info.GLOBAL_ID, class:ast })
}

/*******************************
 * Imports (modules and files) *
 *******************************/
var handleModuleImport = function(context, ast) {
	if (context.modules[ast.name]) { return }
	var module = context.modules[ast.name] = { name: ast.name, path: __dirname + '/Modules/' + ast.name + '/' }
	assert(ast, fs.statSync(module.path).isDirectory(), 'Could not find the module at ' + module.path)
	
	// TODO Read a package/manifest.json file in the module directory, describing name/version/which files to load, etc
	var funFile = module.path + module.name + '.fun'
	if (fs.statSync(funFile).isFile()) { _importFile(funFile, context) }
	
	var jsFile = module.path + module.name + '.js'
	if (path.existsSync(jsFile)) { module.jsCode = fs.readFileSync(jsFile) }
	else { module.jsCode = '// No JS code for ' + module.name }
}

var handleFileImport = function(context, ast) {
	// TODO resolve files relative to current file path
	var filePath = process.cwd() + '/examples/' + ast.path + '.fun'
	assert(ast, path.existsSync(filePath), 'Could not find file for import: "'+filePath+'"')
	context.fileDependencies.push(filePath)
	_importFile(filePath, context, true)
}

var _importFile = function(path, context, a) {
	var tokens = tokenizer.tokenize(path)
	var newAST = parser.parse(tokens)
	resolve(context, newAST)
}

/***************
 * Invocations *
 ***************/
var resolveInvocation = function(context, ast) {
	if (ast.alias) { ast.invocable = lookup(context, ast.alias) }
	var invocable = ast.invocable
	assert(ast, invocable, 'Found an invocation without a reference to a invocable')
	var args = ast.args = resolve(context, ast.args)
	
	var invocableContext = createScope(invocable.contextAtDeclaration)
	var signature = invocable.signature
	
	_resolveSignature(invocableContext, signature)
	
	assert(ast, args.length == signature.length, 'Signature length mismatch')
	for (var i=0; i<args.length; i++) {
		if (!signature[i].valueType) { signature[i].valueType = args[i].valueType }
		log('*** TODO type check signatures')
		// assert(args[i], signature[i].valueType == args[i].valueType, 'Signature type mismatch')
	}
	
	_resolveInvocable(invocableContext, invocable)
	return ast
}

var _resolveSignature = function(context, signatureAST) {
	if (signatureAST.resolved) { return }
	each(signatureAST, function(argumentAST) {
		argumentAST.runtimeName = util.name('TEMPLATE_ARGUMENT_NAME')
		_declareAlias(context, argumentAST, argumentAST.name, argumentAST)
	})
}

var _resolveInvocable = function(context, ast) {
	if (ast.resolved) { return }
	ast.resolved = true
	ast.block = resolve(context, ast.block)
	context.declarations.push(ast)
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
	var loopContext = createScope(context)
	handleDeclaration(loopContext, ast.iterator)
	ast.block = resolve(loopContext, ast.block)
	return ast
}

/*****************
 * If statements *
 *****************/
var resolveIfStatement = function(context, ast) {
	ast.condition = resolve(context, ast.condition)
	ast.ifBlock = resolve(createScope(context), ast.ifBlock)
	if (ast.elseBlock) {
		ast.elseBlock = resolve(createScope(context), ast.elseBlock)
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
	var value = ast.value
	switch(value.type) {
		case 'TEMPLATE':
		case 'HANDLER':
			value.contextAtDeclaration = context
			break
		case 'MUTATION_ITEM_CREATION':
			each(value.properties.content, function(prop) {
				prop.value = lookup(context, prop.value)
			})
			break
		case 'JAVASCRIPT_BRIDGE':
			// do nothing
			break
		case 'RUNTIME_ITERATOR':
			if (value.iterable.type == 'LIST') {
				context.declarations.push(value.iterable)
			}
			break
		case 'STATIC':
			value.type = 'ITEM_PROPERTY'
			value.item = { id:info.LOCAL_ID }
			value.property = ['__local' + util.name()]
			context.declarations.push(value)
			break
		default:
			// do nothing
	}
	_declareAlias(context, ast, ast.name, ast.value)
}
var _declareAlias = function(context, ast, name, valueAST) {
	if (valueAST.type == 'OBJECT_LITERAL') {
		for (var i=0, kvp; kvp = valueAST.content[i]; i++) {
			var nestedDeclarationAST = util.create(ast)
			nestedDeclarationAST.name = name + '.' + kvp.name
			nestedDeclarationAST.value = kvp.value
			handleDeclaration(context, nestedDeclarationAST)
		}
		return
	}
	
	assert(ast, !context.aliases[name], 'Repeat declaration of "'+name+'"')
	context.aliases[name] = valueAST
}

/***********
 * Utility *
 ***********/
var ResolveError = function(ast, msg) {
	var info = ast.info || {}
	this.name = "ResolveError"
	this.message = ['on line', info.line + ',', 'column', info.column, 'of', '"'+info.file+'":', msg].join(' ')
}
ResolveError.prototype = Error.prototype

var createScope = function(context) {
	// Creates a scope by prototypically inheriting from the current context.
	// Reads will propegate up the prototype chain, while writes won't.
	// However, writes *will* shadow values up the prototype chain
	context = util.create(context)
	context.aliases = util.shallowCopy(context.aliases)
	return context
}

var assert = function(ast, ok, msg) { if (!ok) halt(ast, msg) }
var halt = function(ast, msg) {
	var info = ast.info || {}
	if (info.file) { sys.puts(util.grabLine(info.file, info.line, info.column, info.span)) }
	throw new ResolveError(ast, msg)
}
