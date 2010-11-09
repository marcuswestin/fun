var fs = require('fs'),
	sys = require('sys'),
	path = require('path')

var tokenizer = require('./tokenizer'),
	parser = require('./parser')

var util = require('./util'),
	bind = util.bind,
	map = util.map,
	shallowCopy = util.shallowCopy

// Resolve imports by injecting declarations into the reference table
// Resolve aliases to values
// Return an AST with no import statements and no aliases 

// TODO Read types from types
// TODO read tags from tags
var gTypes = _requireDir('./types/'),
	gTags = _requireDir('./tags'),
	gModules = {},
	gDeclarations = []

exports.resolve = util.intercept('ResolveError', function (ast, context) {
	if (!context) { context = {} }
	return {ast:resolve(context, ast), modules:gModules, declarations:gDeclarations}
})

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
		case 'IMPORT_MODULE':    return handleModuleImport(context, ast)
		case 'IMPORT_FILE':      return handleFileImport(context, ast)
		case 'DECLARATION':      return handleDeclaration(context, ast)
		
		case 'XML':              return resolveXML(context, ast)
		case 'IF_STATEMENT':     return resolveIfStatement(context, ast)
		case 'FOR_LOOP':         return resolveForLoop(context, ast)
		case 'INVOCATION':       return resolveInvocation(context, ast)
		
		case 'NESTED_ALIAS':     // fall through
		case 'ALIAS':            return lookup(context, ast)
		
		case 'RUNTIME_ITERATOR': // fall through TODO: Give types to runtime iterator values so that list iterators can take lists of complex values (not just statics)
		case 'ITEM_PROPERTY':    // fall through
		case 'STATIC_VALUE':     return ast
		
		default:                 halt(ast, 'Unknoen AST type "'+ast.type+'"')
	}
}

var lookup = function(context, aliasOrValue) {
	if (aliasOrValue.type == 'NESTED_ALIAS') {
		for (var i=0, prop; prop = aliasOrValue.content[i]; i++) {
			prop.value = lookup(context, prop.value)
		}
	}
	if (aliasOrValue.type != 'ALIAS') { return aliasOrValue }
	else { return lookup(context, _getAlias(context, aliasOrValue)) }
}

/* XML
 ******/
var resolveXML = function(context, ast) {
	ast.attributes = map(ast.attributes, bind(this, _resolveAttributes, context))
	ast.block = resolve(context, ast.block)
	return ast
}

var _resolveAttributes = function(context, ast) {
	assert(ast, ast.namespace.length == 1, 'TODO Handle dot notation XML attribute namespace (for e.g. style.width=100)')
	ast.value = resolve(context, ast.value)
	return ast
}

/* Imports (modules and files)
 ******************************/
var handleModuleImport = function(context, ast) {
	if (gModules[ast.name]) { return }
	var module = gModules[ast.name] = { name: ast.name, path: __dirname + '/modules/' + ast.name + '/' }
	assert(ast, fs.statSync(module.path).isDirectory(), 'Could not find the module at ' + module.path)
	
	// TODO Read a package/manifest.json file in the module directory, describing name/version/which files to load, etc
	if (fs.statSync(module.path + 'lib.fun').isFile()) { _importFile(module.path + 'lib.fun', context) }
	
	if (path.existsSync(module.path + 'lib.js')) { module.jsCode = fs.readFileSync(module.path + 'lib.js') }
	else { module.jsCode = '// No JS code for ' + module.name }
}

var handleFileImport = function(context, ast) {
	var filePath = __dirname + '/' + ast.path + '.fun'
	assert(ast, path.existsSync(filePath), 'Could not find file for import: "'+filePath+'"')
	_importFile(filePath, context)
}

var _importFile = function(path, context) {
	var tokens = tokenizer.tokenize(path)
	var newAST = parser.parse(tokens)
	resolve(context, newAST)
}

/* Invocations
 **************/
var resolveInvocation = function(context, ast) {
	if (ast.alias) { ast.invocable = lookup(context, ast.alias) }
	assert(ast, ast.invocable, 'Found an invocation without a reference to a invocable')
	return ast
}

/* For loops
 ************/
var resolveForLoop = function(context, ast) {
	ast.iterable = lookup(context, ast.iterable)
	assert(ast, ast.iterable.property.length == 1, 'TODO: Handle nested item property references')
	var loopContext = _createScope(context)
	handleDeclaration(loopContext, ast.iterator)
	ast.block = resolve(loopContext, ast.block)
	return ast
}

/* If statements
 ****************/
var resolveIfStatement = function(context, ast) {
	ast.condition.left = lookup(context, ast.condition.left)
	ast.condition.right = lookup(context, ast.condition.right)
	ast.ifBlock = resolve(_createScope(context), ast.ifBlock)
	ast.elseBlock = resolve(_createScope(context), ast.elseBlock)
	return ast
}

/* Declarations
 ***************/
var handleDeclaration = function(context, ast) {
	ast.value = lookup(context, ast.value)
	gDeclarations.push(ast.value)
	_storeAlias(context, ast)
}

var _storeAlias = function(context, ast) {
	var baseValue = _getAlias(context, ast, true),
		namespace = ast.namespace,
		name = namespace[namespace.length - 1],
		value = ast.value
	
	assert(ast, !baseValue['__alias__' + name], 'Repeat declaration')
	if (value.type == 'NESTED_ALIAS') {
		// store the nested alias, and then create a child-alias for each nested property
		// e.g. let foo = { width: 1 } allows you to reference foo.width as well as do e.g. style=foo
		baseValue['__alias__' + name] = value
		for (var i=0, content; content = value.content[i]; i++) {
			var newNamespace = util.copyArray(ast.namespace).concat(content.name),
				newAST = util.shallowCopy(ast, { type: 'ALIAS', value: content.value, namespace: newNamespace })
			
			_storeAlias(context, newAST)
		}
	} else {
		baseValue['__alias__' + name] = ast.value
	}
}
var _getAlias = function(context, ast, skipLast) {
	var value = context,
		namespace = ast.namespace,
		len = namespace.length - (skipLast ? 1 : 0)
	
	for (var i=0; i < len; i++) {
		value = value['__alias__' + namespace[i]]
		assert(ast, value, 'Undeclared alias "'+namespace[i]+'"' + (i == 0 ? '' : ' on "'+namespace.slice(0, i).join('.')+'"'))
		if (value.type == 'ITEM') {
			return util.shallowCopy(ast, { type: 'ITEM_PROPERTY', item:value, property:namespace.slice(i+1) })
		}
	}
	
	return value
}

/* Utility 
 **********/
var ResolveError = function(file, ast, msg) {
	this.name = "ResolveError"
	this.message = ['on line', ast.line + ',', 'column', ast.column, 'of', '"'+file+'":', msg].join(' ')
}
ResolveError.prototype = Error.prototype

function _createScope(context) {
	// Creates a scope by prototypically inheriting from the current context.
	// Reads will propegate up the prototype chain, while writes won't.
	// However, writes *will* shadow values up the prototype chain
	return util.create(context) 
}

function _requireDir(path) {
	map(fs.readdirSync(path), function(path) {
		var jsFileMatch = path.match(/^(.*)\.js$/)
		return jsFileMatch && require(jsFileMatch[1])
	})
}

var assert = function(ast, ok, msg) { if (!ok) halt(ast, msg) }
var halt = function(ast, msg) {
	if (ast.file) { sys.puts(util.grabLine(ast.file, ast.line, ast.column, ast.span)) }
	throw new ResolveError(ast.file, ast, msg)
}
