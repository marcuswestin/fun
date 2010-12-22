/* The resolver primarily does three things:
 * 1) Resolve import statements by injecting declarations from
 *    the imported module into the main context's alias table
 * 2) Resolve aliases to balues
 * 3) Infer the type of all values
 * The resolver returns an AST with no import statements and
 * no aliases, in which all values have been annotated with a type
 *****************************************************************/

var fs = require('fs'),
	sys = require('sys'),
	path = require('path')

var tokenizer = require('./tokenizer'),
	parser = require('./parser')

var util = require('./util'),
	bind = util.bind,
	map = util.map,
	name = util.name,
	shallowCopy = util.shallowCopy

// TODO Read types from types
// TODO read tags from tags
var Tags = require('./Tags'),
	Types = require('./Types')

exports.resolve = util.intercept('ResolveError', function(ast, context) {
	if (!context) {
		context = { modules:{}, declarations:[], fileDependencies:[], aliases: {} }
	}
	var ast = resolve(context, ast)
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
	if (!ast) {
		return null
	} else if (ast instanceof Array) {
		return map(ast, bind(this, resolveStatement, context))
	} else {
		return resolveStatement(context, ast)
	}
}

var resolveStatement = function(context, ast) {
	switch(ast.type) {
		case 'IMPORT_MODULE':        handleModuleImport(context, ast)      ;break
		case 'IMPORT_FILE':          handleFileImport(context, ast)        ;break
		case 'DECLARATION':          handleDeclaration(context, ast)       ;break
		
		case 'XML':                  return resolveXML(context, ast)
		case 'IF_STATEMENT':         return resolveIfStatement(context, ast)
		case 'FOR_LOOP':             return resolveForLoop(context, ast)
		case 'INVOCATION':           return resolveInvocation(context, ast)

		case 'MUTATION':             return resolveMutation(context, ast)
		case 'MUTATION_DECLARATION': handleDeclaration(context, ast)       ;break
		
		case 'ALIAS':                return lookup(context, ast)
		
		case 'RUNTIME_ITERATOR':     return resolveRuntimeIterator(context, ast)
		case 'ITEM_PROPERTY':        return resolveItemProperty(context, ast)
		case 'STATIC_VALUE':         return resolveStaticValue(context, ast)
		case 'COMPOSITE':            return resolveCompositeStatement(context, ast)
		
		// Inline handler - will be compiled inline. Fall through to debugger to then return the AST
		case 'HANDLER':              resolve(createScope(context), ast.block)
		case 'DEBUGGER':             return ast
		
		default:                     console.log(ast); UNKNOWN_AST_TYPE
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
				return util.shallowCopy(value, { iteratorProperty: namespace.slice(i+1).join('.') })
			case 'ITEM':
				return util.shallowCopy(ast, { type: 'ITEM_PROPERTY', item:value, property:namespace.slice(i+1) })
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

/*******************
 * Item Properties *
 *******************/
var resolveItemProperty = function(context, ast) {
	// TODO Can we infer the type of item properties?
	return Types.infer(ast, [])
}

/*****************
 * Static values *
 *****************/
var resolveStaticValue = function(context, ast) {
	switch(ast.valueType) {
		case 'string': return Types.infer(ast, [Types.byName.Text])
		case 'number': return Types.infer(ast, [Types.byName.Number])
		default:       halt(ast, 'Unknown static value type "'+ast.valueType+'"')
	}
}

/************************
 * Composite statements *
 ************************/
var resolveCompositeStatement = function(context, ast) {
	ast.left = resolveStatement(context, ast.left)
	ast.right = resolveStatement(context, ast.right)
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
					return { namespace:attrAST.namespace.concat(kvp.name), value:kvp.value }
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
		assert(dataTypeAttr, value.type == 'STATIC_VALUE' && value.valueType == 'string', 'dataType should be a static string, like "number"')
		var valueStr = value.value.toLowerCase()
		Types.infer(dataAttr.value, [valueStr])
		dataAttr.dataType = valueStr
	}
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
	var filePath = __dirname + '/' + ast.path + '.fun'
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
	assert(ast, ast.invocable, 'Found an invocation without a reference to a invocable')
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
	
	switch(ast.value.type) {
		case 'ITEM_PROPERTY':
			Types.inferByMethod(ast.value, ast.method)
			break
		case 'JAVASCRIPT_BRIDGE':
			break // do nothing
	}
	
	delete ast.alias
	
	return ast
}

/*************
 * For loops *
 *************/
var resolveForLoop = function(context, ast) {
	ast.iteratorRuntimeName = ast.iterator.value.runtimeName = name('RUNTIME_ITERATOR_NAME')
	ast.iterable = lookup(context, ast.iterable)
	ast.iterator.value.iterable = ast.iterable
	Types.infer(ast.iterable, [Types.byName.List])
	var loopContext = createScope(context)
	handleDeclaration(loopContext, ast.iterator)
	ast.block = resolve(loopContext, ast.block)
	return ast
}

var resolveRuntimeIterator = function(context, ast) {
	// TODO give types to runtime iterators, so that you can have complex items in lists
	// TODO Infer type of iterator from the iterable
	return Types.infer(ast, [Types.Text])
}

/*****************
 * If statements *
 *****************/
var resolveIfStatement = function(context, ast) {
	ast.condition.left = lookup(context, ast.condition.left)
	if (ast.condition.right) {
		ast.condition.right = lookup(context, ast.condition.right)
	}
	ast.ifBlock = resolve(createScope(context), ast.ifBlock)
	if (ast.elseBlock) {
		ast.elseBlock = resolve(createScope(context), ast.elseBlock)
	}
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
			context.declarations.push(value)
			resolve(createScope(context), value.block)
			break
		case 'MUTATION_ITEM_CREATION':
			util.each(value.properties.content, function(prop) {
				prop.value = lookup(context, prop.value)
			})
			break
		case 'JAVASCRIPT_BRIDGE':
			// do nothing
			break
		default:
			// do nothing
	}
	_declareAlias(context, ast)
}
var _declareAlias = function(context, ast) {
	var aliases = context.aliases,
		namespace = ast.namespace,
		valueAST = ast.value
	
	if (valueAST.type == 'OBJECT_LITERAL') {
		var baseNamespace = ast.namespace
		for (var i=0, kvp; kvp = valueAST.content[i]; i++) {
			var nestedDeclarationAST = util.create(ast)
			nestedDeclarationAST.namespace = namespace.concat(kvp.name)
			nestedDeclarationAST.value = kvp.value
			handleDeclaration(context, nestedDeclarationAST)
		}
	} else {
		var namespaceKey = ast.namespace.join('.')
		assert(ast, !aliases[namespaceKey], 'Repeat declaration of "'+namespaceKey+'"')
		aliases[namespaceKey] = valueAST
	}
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
	context.aliases = shallowCopy(context.aliases)
	return context
}

var assert = function(ast, ok, msg) { if (!ok) halt(ast, msg) }
var halt = function(ast, msg) {
	var info = ast.info || {}
	if (info.file) { sys.puts(util.grabLine(info.file, info.line, info.column, info.span)) }
	throw new ResolveError(ast, msg)
}
