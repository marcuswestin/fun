// The resolver injects imports and replace aliases with their aliased values

var fs = require('fs'),
	path = require('path'),
	isArray = require('std/isArray'),
	map = require('std/map'),
	curry = require('std/curry'),
	copy = require('std/copy'),
	filter = require('std/filter'),
	blockFunction = require('std/blockFunction'),
	request = require('request'),
	cleanCSS = require('clean-css'),
	exec = require('child_process').exec,
	arrayToObject = require('std/arrayToObject')

var tokenizer = require('./tokenizer'),
	parser = require('./parser')

var util = require('./util'),
	each = util.each,
	assert = util.assert,
	halt = util.halt

exports.resolve = function(ast, opts, callback) {
	var completion = blockFunction(function(err) {
		if (err) { callback(err, null) }
		else { callback(null, { expressions:expressions, imports:context.imports, headers:context.headers }) }
	}).addBlock()
	
	var context = { headers:[], imports:{}, names:{}, opts:opts, completion:completion }

	if (opts['normalize.css']) {
		addStylesheet(context, { href:path.join(__dirname, 'runtime/normalize.css') })
	}
	context.headers.push('<meta charset="UTF-8">')
	
	var expressions = util.cleanup(resolve(context, ast))
	
	completion.removeBlock()
}

/************************
 * Top level statements *
 ************************/
var resolve = function(context, ast) {
	if (isArray(ast)) { return map(ast, curry(resolve, context)) }
	switch (ast.type) {
		// Setup statements
		case 'IMPORT':               handleImport(context, ast)        ;break
		
		case 'TEXT_LITERAL':         return ast
		case 'NUMBER_LITERAL':       return ast
		case 'LOGIC_LITERAL':        return ast
		case 'NULL_LITERAL':         return ast
		
		case 'ARGUMENT':             return ast
		case 'VALUE':                return ast
		case 'NULL':                 return ast
		case 'DEBUGGER':             return ast

		case 'DECLARATION':          return resolveVariableDeclaration(context, ast)
		case 'HANDLER':              return resolveInvocable(context, ast)
		case 'TEMPLATE':             return resolveInvocable(context, ast)
		case 'FUNCTION':             return resolveInvocable(context, ast)

		case 'DICTIONARY_LITERAL':   return resolveObjectLiteral(context, ast)
		case 'LIST_LITERAL':         return resolveList(context, ast)

		case 'XML':                  return resolveXML(context, ast)
		case 'SCRIPT_TAG':           return resolveXML(context, ast)
		case 'IF_STATEMENT':         return resolveIfStatement(context, ast)
		case 'SWITCH_STATEMENT':     return resolveSwitchStatement(context, ast)
		case 'FOR_LOOP':             return resolveForLoop(context, ast)
		
		case 'INVOCATION':           return resolveInvocation(context, ast)
		case 'REFERENCE':            return lookup(context, ast)
		case 'DEREFERENCE':          return resolveDereference(context, ast)
		case 'BINARY_OP':            return resolveCompositeExpression(context, ast)
		case 'UNARY_OP':                return resolveUnaryExpression(context, ast)
		case 'TERNARY_OP':              return resolveTernaryExpression(context, ast)
		
		case 'MUTATION':             return resolveMutation(context, ast)
		case 'RETURN':               return resolveReturn(context, ast)
		
		default:                     halt(ast, '_resolveStatement: Unknown AST type "'+ast.type+'"')
	}
}

/****************
 * Declarations *
 ****************/
var resolveVariableDeclaration = function(context, ast) {
	declare(context, ast, ast.name, ast)
	if (ast.initialValue) {
		ast.initialValue = resolve(context, ast.initialValue)
	} else {
		ast.initialValue = { type:'NULL_LITERAL', value:null }
	}
	return ast
}

var declare = function(context, ast, name, value) {
	assert(ast, !context.names.hasOwnProperty(ast.name), ast.name + ' is already declared in this scope')
	context.names[name] = value
}

/************************
 * References & lookups *
 ************************/
var lookup = function(context, ast) {
	assert(ast, context.names[ast.name], 'Couldn\'t find a variable called "'+ast.name+'"')
	return ast
}

var resolveDereference = function(context, ast) {
	ast.key = resolve(context, ast.key)
	ast.value = resolve(context, ast.value)
	return ast
}


/****************************
 * Object and List literals *
 ****************************/
function resolveObjectLiteral(context, ast) {
	var contentByName = {}
	each(ast.content, function(content) {
		contentByName[content.name] = resolve(context, content.value)
	})
	ast.content = contentByName
	return ast
}

function resolveList(context, ast) {
	ast.content = map(ast.content, function(content) {
		return resolve(context, content)
	})
	return ast
}

/************************
 * Composite expressions *
 ************************/
var resolveCompositeExpression = function(context, ast) {
	ast.left = resolve(context, ast.left)
	ast.right = resolve(context, ast.right)
	return ast
}

var resolveUnaryExpression = function(context, ast) {
	ast.value = resolve(context, ast.value)
	return ast
}

var resolveTernaryExpression = function(context, ast) {
	ast.condition = resolve(context, ast.condition)
	ast.ifValue = resolve(context, ast.ifValue)
	ast.elseValue = resolve(context, ast.elseValue)
	return ast
}

/*******
 * XML *
 *******/
var resolveXML = function(context, ast) {
	each(ast.attributes, function(attribute) {
		if (attribute.expand) {
			attribute.expand = resolve(context, attribute.expand)
		} else {
			attribute.value = resolve(context, attribute.value)
		}
	})
	ast.block = ast.block && filter(resolve(context, ast.block))
	
	var staticAttrs
	if ((staticAttrs=getStylesheetAttrs(ast)) && !ast.block.length) {
		addStylesheet(context, staticAttrs)
		return null
	} else if ((staticAttrs=getStaticAttrs(ast, 'script')) && staticAttrs.src && !ast.inlineJavascript.length) {
		addScriptInclude(context, staticAttrs)
		return null
	} else {
		return ast
	}
}

function getStylesheetAttrs(ast) {
	var staticAttrs = getStaticAttrs(ast, 'link')
	return staticAttrs && staticAttrs.rel && staticAttrs.rel.match(/^stylesheet/) && staticAttrs
}

function getStaticAttrs(ast, tagName) {
	if (ast.tagName != tagName) { return }
	var attributes = ast.attributes,
		staticAttrs = {}
	each(attributes, function(attr) {
		var valueAST = attr.value
		if (valueAST.type != 'TEXT_LITERAL') { return }
		staticAttrs[attr.name] = valueAST.value
	})
	return staticAttrs
}

var addStylesheet = function(context, attrs) {
	var linkHref = attrs.href,
		rel = attrs.rel || 'stylesheet/css'
	
	context.completion.addBlock()
	if (linkHref[0] != '/') { linkHref = path.join(context.opts.dirname, linkHref) }
	
	_getContent(context, linkHref, function doAddStyle(content) {
		var comment = '/* inlined stylesheet: ' + linkHref + ' */\n'
		if (context.opts.minify) { comment = '' }
		
		cssPreprocessors[rel](linkHref, comment + content, function(err, css) {
			if (err) {
				reportError(context, err, 'preprocess', linkHref)
			} else {
				context.headers.push('<style type="text/css">\n'+css+'\n</style>')
				context.completion.removeBlock()
			}
		})
	})
}

var addScriptInclude = function(context, attrs) {
	var scriptSrc = attrs.src
	
	context.completion.addBlock()
	if (scriptSrc[0] != '/') { scriptSrc = path.join(context.opts.dirname, scriptSrc) }
	_getContent(context, scriptSrc, function doAddScript(js) {
		var comment = context.opts.minify ? '' : ('/* inlined script tag: ' + scriptSrc + ' */\n')
		context.headers.push('<script>\n'+js+'\n</script>')
		context.completion.removeBlock()
	})
}

function _getContent(context, url, callback) {
	if (url.match(/^http/)) {
		console.error("Fetching", url)
		request.get(url, function(err, resp, content) {
			if (err) {
				reportError(context, err, 'fetch', url)
			} else if (resp.statusCode != 200) {
				reportError(context, new Error('Server returned non-200 status code: '+resp.statusCode), 'fetch', url)
			} else {
				console.error("Done fetching", linkHref)
				callback(content)
			}
		})
	} else {
		fs.readFile(url, function(err, content) {
			if (err) { reportError(context, err, 'read', url) }
			else { callback(content.toString()) }
		})
	}
}

function reportError(context, err, verb, resource) {
	console.log("Error", verb+'ing', resource)
	context.completion.fail(new Error('Could not '+verb+' '+resource+'\n'+err.message))
}

var cssPreprocessors = {
	'stylesheet': function(href, css, callback) {
		callback(null, css)
	},
	'stylesheet/css': function(href, css, callback) {
		callback(null, css)
	},
	'stylesheet/less': function(href, lessContent, callback) {
		require('less').render(lessContent, callback)
	},
	'stylesheet/stylus': function(href, stylusContent, callback) {
		require('stylus').render(stylusContent, { filename:href }, callback)
	}
}

/*******************************
 * Imports (imports and files) *
 *******************************/
var handleImport = function(context, ast) {
	var importPath = ast.path
	if (importPath[0] == '/') {
		importPath = path.normalize(importPath)
	} else if (importPath[0] == '.') {
		importPath = path.join(context.opts.dirname, importPath)
	} else {
		importPath = path.join(__dirname, 'modules', importPath)
	}
	
	try {
		if (fs.statSync(importPath).isDirectory()) {
			importPath = importPath+'/'+path.basename(importPath)
		}
	} catch(e) {}
	
	_importFile(context, ast, importPath+'.fun')
}

var _importFile = function(context, ast, filePath) {
	if (context.imports[filePath]) { return }
	try { assert(ast, fs.statSync(filePath).isFile(), 'Could not find module '+filePath) }
	catch(e) { halt(ast, e) }
	
	context = util.create(context)
	context.opts = util.create(context.opts, { dirname:path.dirname(filePath) })
	
	var tokens = tokenizer.tokenizeFile(filePath),
		newAST = parser.parse(tokens),
		resolvedAST = util.cleanup(resolve(context, newAST))
	
	context.imports[filePath] = resolvedAST
}

/***************
 * Invocations *
 ***************/
var resolveInvocation = function(context, ast) {
	ast.operand = (ast.operand.type == 'REFERENCE' ? lookup(context, ast.operand) : resolve(context, ast.operand))
	ast.arguments = resolve(context, ast.arguments)
	return ast
}

/**************************************************
 * Invocables - Functions, Handlers and Templates *
 **************************************************/
var resolveInvocable = function(context, ast) {
	if (ast.closure) { return ast } // already resolved
	setNonEnumerableProperty(ast, 'closure', addScope(context))
	each(ast.signature, function(argument) { declare(ast.closure, ast, argument.name, argument) })
	ast.block = filter(resolve(ast.closure, ast.block))
	return ast
}

/*******************************
 * Handler/Function statements *
 *******************************/
var resolveMutation = function(context, ast) {
	ast.arguments = map(ast.arguments, curry(resolve, context))
	ast.operand = resolve(context, ast.operand)
	return ast
}

var resolveReturn = function(context, ast) {
	ast.value = resolve(context, ast.value)
	return ast
}

/*************
 * For loops *
 *************/
var resolveForLoop = function(context, ast) {
	// ast.iterator.operand = ast.iterable
	ast.iterable = resolve(context, ast.iterable)
	ast.context = addScope(context)
	declare(ast.context, ast, ast.iterator.name, ast.iterator)
	ast.block = filter(resolve(ast.context, ast.block))
	return ast
}

/*****************
 * If statements *
 *****************/
var resolveIfStatement = function(context, ast) {
	ast.condition = resolve(context, ast.condition)
	ast.ifContext = addScope(context)
	ast.ifBlock = resolve(ast.ifContext, ast.ifBlock)
	if (ast.elseBlock) {
		ast.elseContext = addScope(context)
		ast.elseBlock = resolve(ast.elseContext, ast.elseBlock)
	}
	return ast
}

/*********************
 * Switch statements *
 *********************/
var resolveSwitchStatement = function(context, ast) {
	ast.controlValue = resolve(context, ast.controlValue)
	each(ast.cases, function(aCase) {
		aCase.values = map(aCase.values, curry(resolve, context))
		each(aCase.values, function(aCase) {
			assert(aCase, _caseValues[aCase.type], "Switch statements' case values must be numbers or texts (e.g. 2, 3, 'hello')")
		})
		aCase.statements = map(aCase.statements, curry(resolve, context))
	})
	var defaultCases = util.pick(ast.cases, function(aCase) { return aCase.isDefault })
	assert(ast, defaultCases.length < 2, "Found two default cases in switch statement - well, that doesn't make sense")
	return ast
}
var _caseValues = arrayToObject(['TEXT_LITERAL', 'NUMBER_LITERAL'])

/***********
 * Utility *
 ***********/
var setNonEnumerableProperty = function(obj, name, value) {
	// We want to be able to add state to objects that are not seen by the test code's assert.deepEquals.
	// We do this by assigning non-enumerable properties in the environments that support it,
	// most notably in node where the test suite is run.
	Object.defineProperty(obj, name, { value:value, enumerable:false })
	return value
}

var addScope = function(context) {
	// Creates a scope by prototypically inheriting the names dictionary from the current context.
	// Reads will propegate up the prototype chain, while writes won't.
	// New names written to context.names will shadow names written further up the chain, but won't overwrite them.
	context = util.create(context)
	context.names = copy(context.names) // shouldn't this be create()?
	return context
}
