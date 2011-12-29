// The resolver injects imports and replace aliases with their aliased values

var fs = require('fs'),
	path = require('path'),
	std = require('std'),
	isArray = require('std/isArray'),
	map = require('std/map'),
	curry = require('std/curry'),
	copy = require('std/copy'),
	filter = require('std/filter')

var tokenizer = require('./tokenizer'),
	parser = require('./parser')

var util = require('./util'),
	each = util.each,
	log = util.log,
	assert = util.assert,
	halt = util.halt

exports.resolve = function(ast) {
	var context = { imports:{}, names:{}, declarations:[] },
		expressions = util.cleanup(resolve(context, ast))
	return {
		expressions:expressions,
		declarations:context.declarations,
		imports:context.imports
	}
}

/************************
 * Top level statements *
 ************************/
var resolve = function(context, ast) {
	if (isArray(ast)) { return map(ast, curry(resolve, context)) }
	switch (ast.type) {
		// Setup statements
		case 'IMPORT_MODULE':        handleModuleImport(context, ast)        ;break
		case 'IMPORT_FILE':          handleFileImport(context, ast)          ;break
		case 'VARIABLE':             handleVariable(context, ast)            ;break
		
		case 'VALUE_LITERAL':        return ast
		case 'ARGUMENT':             return ast
		case 'ITERATOR':             return ast
		case 'VALUE':                return ast
		case 'NULL':                 return ast
		case 'DEBUGGER':             return ast
		case 'SCRIPT_TAG':           return ast

		case 'HANDLER':              return resolveInvocable(context, ast)
		case 'TEMPLATE':             return resolveInvocable(context, ast)
		case 'FUNCTION':             return resolveInvocable(context, ast)

		case 'OBJECT_LITERAL':       return resolveObjectLiteral(context, ast)
		case 'LIST_LITERAL':         return resolveList(context, ast)

		case 'XML':                  return resolveXML(context, ast)
		case 'IF_STATEMENT':         return resolveIfStatement(context, ast)
		case 'SWITCH_STATEMENT':     return resolveSwitchStatement(context, ast)
		case 'FOR_LOOP':             return resolveForLoop(context, ast)
		
		case 'INVOCATION':           return resolveInvocation(context, ast)
		case 'REFERENCE':            return lookup(context, ast)
		case 'COMPOSITE':            return resolveCompositeExpression(context, ast)
		
		case 'MUTATION':             return resolveMutation(context, ast)
		
		// case 'ALIAS':                return resolve(context, lookup(context, ast))
		default:                     halt(ast, '_resolveStatement: Unknown AST type "'+ast.type+'"')
	}
}

/****************
 * Declarations *
 ****************/
var handleVariable = function(context, ast) {
	declare(context, ast, ast.name, ast)
	ast.initialValue = resolve(context, ast.initialValue)
}

var declare = function(context, ast, name, value) {
	assert(ast, !context.names.hasOwnProperty(ast.name), ast.name + ' is already declared in this scope')
	context.names[name] = value
	context.declarations.push(value)
}

/************************
 * References & lookups *
 ************************/
var lookup = function(context, ast) {
	assert(ast, context.names[ast.name], 'Couldn\'t find a variable called "'+ast.name+'"')
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
	each(ast.content, function(content) {
		content.value = resolve(context, content.value)
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

/*******
 * XML *
 *******/
var resolveXML = function(context, ast) {
	each(ast.attributes, function(attribute) {
		attribute.value = resolve(context, attribute.value)
	})
	ast.block = filter(resolve(context, ast.block))
	return ast
}

/*******************************
 * Imports (imports and files) *
 *******************************/
var handleModuleImport = function(context, ast) {
	var filePath = __dirname + '/Modules/' + ast.name + '.fun'
	_importFile(context, ast, filePath)
}

var handleFileImport = function(context, ast) {
	// TODO resolve files relative to current file path
	var filePath = path.resolve(process.cwd() + '/examples/' + ast.path + '.fun')
	_importFile(context, filePath, ast)
}

var _importFile = function(context, ast, filePath) {
	if (context.imports[filePath]) { return }
	assert(ast, fs.statSync(filePath).isFile(), 'Could not find module '+filePath)
	var tokens = tokenizer.tokenizeFile(filePath),
		newAST = parser.parse(tokens),
		resolvedAST = util.cleanup(resolve(context, newAST))
	
	context.imports[filePath] = resolvedAST
}

/***************
 * Invocations *
 ***************/
var invocables = { 'TEMPLATE':1, 'FUNCTION':1, 'HANDLER':1 }
var resolveInvocation = function(context, ast) {
	ast.operand = lookup(context, ast.operand)
	assert(ast, invocables[ast.operand.type], 'Unknown invocable type "'+ast.operand.type+'"')
	ast.arguments = resolve(context, ast.arguments)
	assert(ast.arguments, ast.arguments.length == ast.operand.signature.length, 'Expected '+ast.operand.signature.length+' arguments but found '+ast.arguments.length)
	return ast
}

/**************************************************
 * Invocables - Functions, Handlers and Templates *
 **************************************************/
var resolveInvocable = function(context, ast) {
	if (ast.closure) { return ast } // already resolved
	context.declarations.push(ast)
	setNonEnumerableProperty(ast, 'closure', addScope(context))
	each(ast.signature, function(argument) { declare(ast.closure, ast, argument.name, argument) })
	ast.block = filter(resolve(ast.closure, ast.block))
	return ast
}

/*************
 * Mutations *
 *************/
var resolveMutation = function(context, ast) {
	ast.arguments = map(ast.arguments, curry(resolve, context))
	ast.operand = resolve(context, ast.operand)
	return ast
}

/*************
 * For loops *
 *************/
var resolveForLoop = function(context, ast) {
	ast.iterable = lookup(context, ast.iterable)
	ast.iterator.operand = ast.iterable
	ast.context = addScope(context)
	declare(loopContext, ast, ast.iterator.name, ast.iterator)
	ast.block = filter(resolve(loopContext, ast.block))
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
			assert(aCase, aCase.type == 'VALUE_LITERAL', "Switch statements' case values must be numbers or texts (e.g. 2, 3, 'hello')")
		})
		aCase.statements = map(aCase.statements, curry(resolve, context))
	})
	var defaultCases = util.pick(ast.cases, function(aCase) { return aCase.isDefault })
	assert(ast, defaultCases.length < 2, "Found two default cases in switch statement - well, that doesn't make sense")
	return ast
}

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
	context = util.create(context, { declarations:[] })
	context.names = copy(context.names) // shouldn't this be create()?
	return context
}
