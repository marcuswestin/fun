var fs = require('fs'),
	sys = require('sys'),
	path = require('path'),
	util = require('./util'),
	bind = util.bind,
	map = util.map,
	repeat = util.repeat,
	boxComment = util.boxComment,
	q = util.q,
	tokenizer = require('./tokenizer'),
	parser = require('./parser'),
	compiler = exports,
	gModules = {}

exports.compile = util.intercept('CompileError', function (ast, context) {
	
	context = context || { hookName: name('ROOT_HOOK'), referenceTable: {} } // root context
	
	return code(
		';(function funApp() {',
		'	var {{ hookName }} = fun.name("rootHook")',
		'	fun.setHook({{ hookName }}, document.body)',
		'	{{ code }}',
		'	{{ modules }}',
		'})(); // let\'s kick it',
		{
			hookName: context.hookName,
			code: compile(context, ast),
			modules: map(gModules, function(module, name) {
				return boxComment('Module: ' + name) + '\n' + module.jsCode }).join('\n\n\n')
		})
})




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
		case 'STATIC_VALUE':    return compileStaticValue(context, ast)
		case 'ALIAS':           return compileStatement(context, resolve(context, ast))
		case 'ITEM_PROPERTY':   return compileItemProperty(context, ast)
		case 'XML':             return compileXML(context, ast)
		case 'DECLARATION':     return compileDeclaration(context, ast)
		case 'IF_STATEMENT':    return compileIfStatement(context, ast)
		case 'FOR_LOOP':        return compileForLoop(context, ast)
		case 'INVOCATION':      return compileInvocation(context, ast)
		case 'IMPORT_MODULE':   return compileModuleImport(context, ast)
		case 'IMPORT_FILE':     return compileFileImport(context, ast)
		default:                halt(ast, 'Unknown AST type ' + ast.type)
	}
}

/*****************
 * Static values *
 *****************/
function compileStaticValue(context, ast) {
	return code(
		'fun.hook({{ parentHook }}, fun.name("inlineString")).innerHTML = {{ value }}',
		{
			parentHook: context.hookName,
			value: JSON.stringify(ast.value)
		})
}

/************************
 * Item Property values *
 ************************/
function compileItemProperty(context, ast) {
	assert(ast.property.length > 0, ast, 'Missing property on item reference. "'+ast.namespace[0]+'" should probably be something like "'+ast.namespace[0]+'.foo"')
	assert(ast.property.length == 1, ast, 'TODO: Handle nested property references')
	var hookName = name('ITEM_PROPERTY_HOOK')
	return code(
		'fun.hook({{ parentHook }}, {{ hookName }})',
		'fun.observe({{ type }}, {{ id }}, {{ property }}, function(mutation, value) {',
		'	fun.getHook({{ hookName }}).innerHTML = value',
		'})',
		{
			parentHook: context.hookName,
			hookName: q(hookName),
			id: q(ast.item.id),
			property: q(ast.property[0]),
			type: q('BYTES')
		})
}

/*******
 * XML *
 *******/
function compileXML(context, ast) {
	var hookName = name('XML_HOOK'),
		newContext = util.shallowCopy(context, { hookName:hookName })
	
	var attributes = _handleXMLAttributes(context, ast, hookName)
	return code(
		'var {{ hookName }} = fun.name()',
		'fun.hook({{ parentHook }}, {{ hookName }}, {{ tagName }}, {{ staticAttributes }})',
		'{{ dynamicAttributesCode }}',
		'{{ childCode }}',
		{
			parentHook: context.hookName,
			hookName: hookName,
			tagName: q(ast.tag),
			staticAttributes: q(attributes.staticAttributes),
			dynamicAttributesCode: attributes.dynamicCode,
			childCode: ast.block ? compile(newContext, ast.block) : ''
		})
}

function _handleXMLAttributes(context, ast, hookName) {
	var staticAttributes = {},
		dynamicCode = []
	for (var i=0, attribute; attribute = ast.attributes[i]; i++) {
		assert(attribute.namespace.length == 1, ast, 'TODO Handle dot notation XML attribute namespace (for e.g. style.width=100)')
		var name = attribute.namespace[0],
			value = resolve(context, attribute.value),
			match
		if (name == 'style') {
			assert(value.type == 'NESTED_ALIAS', ast, 'You can only assign the style attribute to a JSON object literal, e.g. <div style={ width:100, height:100, background:"red" }/>')
			_handleStyleAttribute(staticAttributes, dynamicCode, context, ast, hookName, value.content)
		} else if (match = name.match(/^on(\w+)$/)) {
			halt('TODO Handle on* xml attributes')
		} else if (value.type == 'STATIC_VALUE') {
			staticAttributes[name] = value.value
		} else {
			assert(value.type != 'NESTED_ALIAS', ast, 'Does not make sense to assign a JSON object literal to other attribtues than "style" (tried to assign to "'+name+'")')
			_handleDynamicAttribute(dynamicCode, context, ast, hookName, name, value)
		}
	}
	return { staticAttributes: staticAttributes, dynamicCode: dynamicCode.join('\n') }
}

// add static attributes to staticAttrs object
function _handleStyleAttribute(staticAttrs, dynamicCode, context, ast, hookName, styles) {
	var styleAttribute = staticAttrs['style'] = {}
	for (var i=0, style; style = styles[i]; i++) {
		var value = resolve(context, style.value)
		if (value.type == 'STATIC_VALUE') {
			styleAttribute[style.name] = value.value
		} else {
			_handleDynamicAttribute(dynamicCode, context, ast, hookName, 'style.' + style.name, value)
		}
	}
}

// add code for dynamic properties to dynamicCode
function _handleDynamicAttribute(dynamicCode, context, ast, hookName, attrName, value) {
	assert(value.property.length == 1, ast, 'TODO: Handle nested item property references')
	dynamicCode.push(code(
		'fun.observe({{ type }}, {{ id }}, {{ property }}, function(mutation, value) {',
		'	fun.attr({{ hookName }}, {{ attr }}, value)',
		'})',
		{
			type: q('BYTES'),
			id: q(value.item.id),
			property: q(value.property[0]),
			attr: q(attrName),
			hookName: hookName
		}))
}

/*************************
 * Module & File Imports *
 *************************/
function compileModuleImport(context, ast) {
	if (gModules[ast.name]) { return }
	var module = gModules[ast.name] = {
		name: ast.name,
		path: __dirname + '/modules/' + ast.name + '/'
	}
	assert(fs.statSync(module.path).isDirectory(), ast, 'Could not find the module at ' + module.path)
	// TODO Read a package/manifest.json file in the module directory, describing name/version/which files to load, etc
	if (fs.statSync(module.path + 'lib.fun').isFile()) {
		var result = _importFile(module.path + 'lib.fun', context)
	}
	if (path.existsSync(module.path + 'lib.js')) {
		module.jsCode = fs.readFileSync(module.path + 'lib.js')
	} else {
		module.jsCode = '// No JS code for ' + module.name
	}
	return result
}

function compileFileImport(context, ast) {
	var filePath = __dirname + '/' + ast.path + '.fun'
	assert(path.existsSync(filePath), ast, 'Could not find file for import: "'+filePath+'"')
	return _importFile(filePath, context)
}

function _importFile(path, context) {
	var tokens = tokenizer.tokenize(path)
	var newAST = parser.parse(tokens)
	return compile(context, newAST)
}

/**********************
 * Alias Declarations *
 **********************/

function compileDeclaration(context, ast) {
	_storeAlias(context, ast)
	return ''
}

var _storeAlias = function(context, ast) {
	var baseValue = _getAlias(context, ast, true),
		namespace = ast.namespace,
		name = namespace[namespace.length - 1],
		value = ast.value
	
	assert(!baseValue['__alias__' + name], ast, 'Repeat declaration')
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
	var referenceTable = context.referenceTable,
		value = referenceTable,
		namespace = ast.namespace,
		len = namespace.length - (skipLast ? 1 : 0)
	
	for (var i=0; i < len; i++) {
		value = value['__alias__' + namespace[i]]
		if (!value) {
			halt(ast, 'Undeclared alias "'+namespace[i]+'"' + (i == 0 ? '' : ' on "'+namespace.slice(0, i).join('.')+'"'))
		}
		if (value.type == 'ITEM') {
			return util.shallowCopy(ast, { type: 'ITEM_PROPERTY', item:value, property:namespace.slice(i+1) })
		}
	}
	
	return value
}

var resolve = function(context, aliasOrValue) {
	if (aliasOrValue.type != 'ALIAS') { return aliasOrValue }
	else { return resolve(context, _getAlias(context, aliasOrValue)) }
}

/**********************
 * If/Else statements *
 **********************/
function compileIfStatement(context, ast) {
	var left = resolve(context, ast.condition.left),
		right = resolve(context, ast.condition.right),
		ifContext = util.shallowCopy(context, { hookName: name('IF_HOOK') }),
		elseContext = util.shallowCopy(context, { hookName: name('ELSE_HOOK') }),
		isDynamic = { left:(left.type == 'ITEM_PROPERTY'), right:(right.type == 'ITEM_PROPERTY') }
	
	return code(
		'var {{ ifHookName }} = fun.name(),',
		'	{{ elseHookName }} = fun.name()',
		';(function(ifBranch, elseBranch) {',
		'	fun.hook({{ parentHookName }}, {{ ifHookName }})',
		'	fun.hook({{ parentHookName }}, {{ elseHookName }})',
		'	var ready = fun.block(evaluate, {fireOnce: false}), lastTime',
		'	{{ leftIsDynamic }} && fun.observe("BYTES", {{ leftID }}, {{ leftProperty }}, ready.addBlock())',
		'	{{ rightIsDynamic }} && fun.observe("BYTES", {{ rightID }}, {{ rightProperty }}, ready.addBlock())',
		'	ready.tryNow()',
		'	function evaluate() {',
		'		var thisTime = {{ leftValue }} {{ comparison }} {{ rightValue }}',
		'		if (lastTime !== undefined && thisTime == lastTime) { return }',
		'		fun.destroyHook(lastTime ? {{ ifHookName }} : {{ elseHookName }})',
		'		lastTime = thisTime',
		'		thisTime ? ifBranch() : elseBranch()',
		'	}',
		'})(',
		'	function() {',
		'		{{ ifCode }}',
		'	},',
		'	function() {',
		'		{{ elseCode }}',
		'	}',
		');',
		{
			parentHookName: context.hookName,
			ifHookName: ifContext.hookName,
			elseHookName: elseContext.hookName,
			leftIsDynamic: isDynamic.left,
			rightIsDynamic: isDynamic.right,
			leftValue: isDynamic.left ? 'fun.cachedValue({{ leftID }}, {{ leftProperty }})' : left.value,
			rightValue: isDynamic.right ? 'fun.cachedValue({{ rightID }}, {{ rightProperty }})' : right.value,
			comparison: ast.condition.comparison,
			leftID: isDynamic.left && q(left.item.id),
			rightID: isDynamic.right && q(right.item.id),
			leftProperty: isDynamic.left && q(left.property[0]),
			rightProperty: isDynamic.right && q(right.property[0]),
			ifCode: compile(ifContext, ast.ifBlock),
			elseCode: ast.elseBlock && compile(elseContext, ast.elseBlock)
		})
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
		code = '\n' + snippets.join('\n'),
		match
	
	while (match = code.match(emitReplaceRegex)) {
		var wholeMatch = match[0],
			nameMatch = match[1],
			value = injectObj[nameMatch]
		code = code.replace(wholeMatch, typeof value == 'undefined' ? 'MISSING INJECT VALUE' : value)
	}
	return code
}

var CompileError = function(file, ast, msg) {
	this.name = "CompileError"
	this.message = ['on line', ast.line + ',', 'column', ast.column, 'of', '"'+file+'":', msg].join(' ')
}
CompileError.prototype = Error.prototype

var assert = function(ok, ast, msg) { if (!ok) halt(ast, msg) }
var halt = function(ast, msg) {
	sys.puts(util.grabLine(ast.file, ast.line, ast.column, ast.span))
	throw new CompileError(ast.file, ast, msg)
}