var fs = require('fs'),
	sys = require('sys'),
	util = require('./util'),
	bind = util.bind,
	map = util.map,
	repeat = util.repeat,
	boxComment = util.boxComment,
	q = util.q,
	tokenizer = require('./tokenizer'),
	parser = require('./parser'),
	compiler = exports	

exports.compile = util.intercept('CompileError', doCompile)

var CompileError = function(file, ast, msg) {
	this.name = "CompileError"
	this.message = ['on line', ast.line + ',', 'column', ast.column, 'of', '"'+file+'":', msg].join(' ')
}
CompileError.prototype = Error.prototype

function doCompile(ast, rootContext) {
	rootContext = rootContext || { hookName: name('ROOT_HOOK'), referenceTable: {} }
	
	return code(
		'function initFunApp() {',
		'	var {{ rootHookName }} = fun.name("rootHook")',
		'	fun.setHook({{ rootHookName }}, document.body)',
			compile(rootContext, ast),
		'}',
		{
			rootHookName: rootContext.hookName
		})
		+ '\n\ninitFunApp() // let\'s kick it'
}

/*********************
 * Utility functions *
 *********************/
function name(readable) { return '_' + (readable || '') + '$' + (name._uniqueId++) }
name._uniqueId = 0

var emitReplaceRegex = /{{\s*(\w+)\s*}}/
function code(/* line1, line2, line3, ..., lineN, optionalValues */) {
	var argsLen = arguments.length,
		lastArg = arguments[argsLen - 1],
		injectObj = (typeof lastArg == 'string' ? null : lastArg),
		snippets = Array.prototype.slice.call(arguments, 0, injectObj ? argsLen - 1 : argsLen),
		code, match
	
	code = '\n' + snippets.join('\n')
	if (!injectObj) { return code }
	
	while (match = code.match(emitReplaceRegex)) {
		var wholeMatch = match[0],
			nameMatch = match[1]
		code = code.replace(wholeMatch, injectObj[nameMatch] || ('MISSING INJECT VALUE' + nameMatch))
	}
	return code
}

var assert = function(ok, ast, msg) { if (!ok) halt(ast, msg) }
var halt = function(ast, msg) {
	sys.puts(util.grabLine(ast.file, ast.line, ast.column, ast.span))
	throw new CompileError(ast.file, ast, msg)
}

/************************
 * Top level statements *
 ************************/
function compile(context, ast) {
	assert(context && context.hookName && context.referenceTable, ast, "compile called with invalid context")
	if (ast instanceof Array) {
		return map(ast, bind(this, compileStatement, context)).join('\n') + '\n'
	} else {
		return compileStatement(context, ast) + '\n'
	}
}

function compileStatement(context, ast) {
	switch (ast.type) {
		case 'STATIC_VALUE':
			return compileStaticValue(context, ast)
		case 'ALIAS':
			return compileAlias(context, ast)
		case 'XML':
			return compileXML(context, ast)
		case 'DECLARATION':
			return compileDeclaration(context, ast)
		case 'IF_STATEMENT':
			return compileIfStatement(context, ast)
		case 'FOR_LOOP':
			return compileForLoop(context, ast)
		case 'INVOCATION':
			return compileInvocation(context, ast)
		case 'IMPORT_MODULE':
			return compileModuleImport(context, ast)
		case 'IMPORT_FILE':
			return compileFileImport(cotext, ast)
		default:
			halt(ast, 'Unknown AST type ' + ast.type)
	}
}

/**********************
 * Aliases and Values *
 **********************/
function compileAlias(context, ast) {
	assert(ast.type == 'ALIAS', ast, 'Expected an ALIAS but found a ' + ast.type)
	var valueAST = _getReference(context, ast)
	switch(valueAST.type) {
		case 'STATIC_VALUE':
			return compileStaticValue(context, valueAST)
		case 'ITEM':
			assert(ast.namespace.length > 1, ast, 'Missing property on item reference. "'+ast.namespace[0]+'" should probably be something like "'+ast.namespace[0]+'.foo"')
			// assert(ast.namespace.length == 2, ast, 'TODO: Handle nested property references')
			return compileItemProperty(context, valueAST, ast.namespace.slice(1))
		default:
			halt(ast, 'Unknown value type ' + valueAST.type)
	}
}

function compileStaticValue(context, ast) {
	return code(
		'fun.hook({{ parentHook }}, fun.name("inlineString")).innerHTML = {{ value }}',
		{
			parentHook: context.hookName,
			value: JSON.stringify(ast.value)
		})
}

function compileItemProperty(context, ast, namespace) {
	var hookName = name('ITEM_PROPERTY_HOOK')
	return code(
		'fun.hook({{ parentHook }}, {{ hookName }})',
		'fun.observe({{ type }}, {{ id }}, {{ property }}, function(mutation, value) {',
		'	fun.getHook({{ hookName }}).innerHTML = value',
		'})',
		{
			parentHook: context.hookName,
			hookName: q(hookName),
			id: q(ast.id),
			property: q(namespace[0]),
			type: q('BYTES')
		})
}

/*******
 * XML *
 *******/
function compileXML(context, ast) {
	halt(ast, 'TODO compileXML not yet implemented')
}

/**************************
 * Imports & Declarations *
 **************************/
function compileModuleImport(context, ast) {
	var path = __dirname + '/modules/' + ast.name + '/'
	assert(fs.statSync(path).isDirectory(), ast, 'Could not find the module at ' + path)
	// TODO Read a package/manifest.json file in the module directory, describing name/version/which files to load, etc
	if (fs.statSync(path + 'lib.fun').isFile()) {
		var tokens = tokenizer.tokenize(path + 'lib.fun')
		var newAST = parser.parse(tokens)
		var result = compile(context, newAST)
	}
	return result
	// // gModuleCode.push(boxComment('Module: '+ast.name), '\n\n', )
	// // Hack for now - set the context for the API to hidden variable
	// api.__context = context
	// var module = require(path)
	// module.init(api)
}

var api = {
	declare: function(name, params) {
		
		__context.referenceTable['__alias__' + name] = params
	}
}

function compileFileImport(context, ast) {
	halt(ast, 'TODO compileFileImport')
	// read file
	// tokenize
	// parse
	// compile without output
	// merge contexts
}

function compileDeclaration(context, ast) {
	_setReference(context, ast)
	return ''
}

var _setReference = function(context, ast) {
	var baseValue = _getReference(context, ast, true),
		name = ast.namespace[ast.namespace.length - 1]
	baseValue['__alias__' + name] = ast.value
}
var _getReference = function(context, ast, skipLast) {
	var referenceTable = context.referenceTable,
		value = referenceTable,
		namespace = ast.namespace,
		len = namespace.length - (skipLast ? 1 : 0)
	
	for (var i=0; i < len; i++) {
		value = value['__alias__' + namespace[i]]
		if (!value) {
			halt(ast, 'Undeclared alias "'+namespace[i]+'"' + (i == 0 ? '' : ' on "'+namespace.slice(0, i).join('.')+'"'))
		}
		if (value.type == 'ITEM') { return value } // Item property lookups are dynamic, not static
	}
	
	return value
}

/**********************
 * If/Else statements *
 **********************/
function compileIfStatement(context, ast) {
	halt(ast, 'TODO compileIfStatement not yet implemented')
}

/*************
 * For loops *
 *************/
function compileForLoop(context, ast) {
	halt(ast, 'TODO compileForLoop not yet implemented')
}

/****************************************
 * Invocations (handlers and templates) *
 ****************************************/
function compileInvocation(context, ast) {
	halt(ast, 'TODO compileInvocation not yet implemented')
}
